from fastapi import APIRouter, Depends, HTTPException, status, BackgroundTasks
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, delete
from app.database import get_db
from app.auth.dependencies import get_current_user, CurrentUser
from app.models.project import Project
from app.models.architecture import Architecture
from app.schemas.project import ProjectCreate, ProjectQuestionsUpdate, ProjectResponse
from app.schemas.architecture import ArchitectureResponse
from app.services.gemini import generate_architecture
from app.services.diagram_builder import build_diagram
from app.services.s3 import upload_architecture_report
import logging
from uuid import UUID
from typing import List

router = APIRouter(prefix="/projects", tags=["Projects"])
logger = logging.getLogger(__name__)


@router.get("", response_model=List[ProjectResponse])
async def list_projects(
    db: AsyncSession = Depends(get_db),
    current_user: CurrentUser = Depends(get_current_user),
):
    result = await db.execute(
        select(Project)
        .where(Project.owner_id == current_user.sub)
        .order_by(Project.created_at.desc())
    )
    return result.scalars().all()


@router.post("", response_model=ProjectResponse, status_code=status.HTTP_201_CREATED)
async def create_project(
    payload: ProjectCreate,
    db: AsyncSession = Depends(get_db),
    current_user: CurrentUser = Depends(get_current_user),
):
    project = Project(
        owner_id=current_user.sub,
        name=payload.name,
        description=payload.description,
    )
    db.add(project)
    await db.commit()
    await db.refresh(project)
    return project


@router.get("/{project_id}", response_model=ProjectResponse)
async def get_project(
    project_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: CurrentUser = Depends(get_current_user),
):
    result = await db.execute(
        select(Project).where(
            Project.id == project_id, Project.owner_id == current_user.sub
        )
    )
    project = result.scalar_one_or_none()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    return project


@router.put("/{project_id}/questions", response_model=ProjectResponse)
async def update_questions(
    project_id: UUID,
    payload: ProjectQuestionsUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: CurrentUser = Depends(get_current_user),
):
    result = await db.execute(
        select(Project).where(
            Project.id == project_id, Project.owner_id == current_user.sub
        )
    )
    project = result.scalar_one_or_none()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    for field, value in payload.model_dump().items():
        setattr(project, field, value)
    await db.commit()
    await db.refresh(project)
    return project


async def _do_generate(project_id: UUID, user_sub: str):
    """Background task: runs AI generation with its own DB session."""
    from app.database import AsyncSessionLocal
    async with AsyncSessionLocal() as db:
        result = await db.execute(select(Project).where(Project.id == project_id))
        project = result.scalar_one_or_none()
        if not project:
            return
        try:
            questions = {
                "expected_users": project.expected_users,
                "budget": project.budget,
                "region": project.region,
                "availability_requirement": project.availability_requirement,
                "database_needs": project.database_needs,
                "storage_needs": project.storage_needs,
                "auth_method": project.auth_method,
            }
            ai_output = await generate_architecture(project.description, questions)

            await db.execute(
                delete(Architecture).where(Architecture.project_id == project_id)
            )

            arch_data = {}
            for tier_name in ["startup", "production", "enterprise"]:
                tier = getattr(ai_output, tier_name)
                services_list = [s.model_dump() for s in tier.services]
                nodes, edges = build_diagram(services_list)
                arch = Architecture(
                    project_id=project_id,
                    owner_id=user_sub,
                    tier=tier_name,
                    services=services_list,
                    total_monthly_cost_usd=tier.total_monthly_cost_usd,
                    security_recommendations=tier.security_recommendations,
                    deployment_steps=tier.deployment_steps,
                    diagram_nodes=nodes,
                    diagram_edges=edges,
                )
                db.add(arch)
                arch_data[tier_name] = {"services": services_list, "nodes": nodes}

            project.status = "ready"
            await db.commit()

            await upload_architecture_report(str(project_id), user_sub, arch_data)

        except Exception as e:
            logger.error(f"Background generation failed: {e}")
            try:
                project.status = "error"
                await db.commit()
            except Exception:
                pass


@router.post("/{project_id}/generate", status_code=status.HTTP_202_ACCEPTED)
async def generate_architectures(
    project_id: UUID,
    background_tasks: BackgroundTasks,
    db: AsyncSession = Depends(get_db),
    current_user: CurrentUser = Depends(get_current_user),
):
    result = await db.execute(
        select(Project).where(
            Project.id == project_id, Project.owner_id == current_user.sub
        )
    )
    project = result.scalar_one_or_none()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    if not project.expected_users:
        raise HTTPException(
            status_code=400, detail="Complete the clarifying questions first"
        )

    project.status = "generating"
    await db.commit()

    background_tasks.add_task(_do_generate, project_id, current_user.sub)

    return {"status": "generating", "project_id": str(project_id)}



@router.delete("/{project_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_project(
    project_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: CurrentUser = Depends(get_current_user),
):
    result = await db.execute(
        select(Project).where(
            Project.id == project_id, Project.owner_id == current_user.sub
        )
    )
    project = result.scalar_one_or_none()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    await db.delete(project)
    await db.commit()
