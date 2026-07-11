import google.generativeai as genai
import json
import logging
from typing import Optional
from app.config import get_settings
from app.schemas.ai_output import AIOutputSchema
from app.services.cost_table import get_price_table_text
from pydantic import ValidationError

logger = logging.getLogger(__name__)
settings = get_settings()

SYSTEM_PROMPT = """
You are an expert AWS Solutions Architect. Your job is to generate THREE AWS architecture recommendations
(Startup, Production, Enterprise) for the described application.

RULES:
1. Return ONLY valid JSON — no markdown, no explanation, no code blocks.
2. Use ONLY the services and prices from the AWS PRICE TABLE below. Never invent prices.
3. Each tier must include: services array, total_monthly_cost_usd (sum of service costs),
   security_recommendations (list of strings), deployment_steps (list of strings).
4. Each service object must have: name, aws_service, tier, rationale, monthly_cost_usd, icon.
5. icon must be one of: ec2, ecs, eks, lambda, rds, dynamodb, s3, cloudfront, alb, cognito,
   elasticache, api-gateway, sqs, sns, ses, waf, cloudwatch, route53, nat-gateway, acm, secrets-manager
6. Startup tier: minimal cost, single-region, simple setup.
   Production tier: HA, multi-AZ, proper scaling.
   Enterprise tier: multi-region, advanced security, full observability.
7. total_monthly_cost_usd must equal the exact sum of all service monthly_cost_usd values in that tier.

{price_table}

JSON SCHEMA:
{{
  "startup": {{
    "services": [{{
      "name": "string",
      "aws_service": "string",
      "tier": "startup",
      "rationale": "string",
      "monthly_cost_usd": number,
      "icon": "string"
    }}],
    "total_monthly_cost_usd": number,
    "security_recommendations": ["string"],
    "deployment_steps": ["string"]
  }},
  "production": {{ ... same structure ... }},
  "enterprise": {{ ... same structure ... }}
}}
"""


def build_user_prompt(project_description: str, questions: dict) -> str:
    return f"""
App Description: {project_description}

Clarifying Answers:
- Expected Users: {questions.get('expected_users', 'Not specified')}
- Monthly Budget: {questions.get('budget', 'Not specified')}
- Preferred AWS Region: {questions.get('region', 'Not specified')}
- Availability Requirement: {questions.get('availability_requirement', 'Not specified')}
- Database Needs: {questions.get('database_needs', 'Not specified')}
- Storage Needs: {questions.get('storage_needs', 'Not specified')}
- Authentication Method: {questions.get('auth_method', 'Not specified')}

Generate three AWS architecture tiers (startup, production, enterprise) as valid JSON only.
"""


async def generate_architecture(
    project_description: str, questions: dict
) -> AIOutputSchema:
    """Call Gemini API and return validated architecture output. Retries once on validation failure."""
    genai.configure(api_key=settings.gemini_api_key)
    model = genai.GenerativeModel(
        model_name="gemini-2.5-flash",
        system_instruction=SYSTEM_PROMPT.format(price_table=get_price_table_text()),
    )
    user_prompt = build_user_prompt(project_description, questions)

    for attempt in range(2):
        try:
            response = model.generate_content(
                user_prompt,
                generation_config=genai.types.GenerationConfig(
                    temperature=0.2,
                    response_mime_type="application/json",
                ),
            )
            raw_text = response.text.strip()
            # Strip markdown code fences if present
            if raw_text.startswith("```"):
                raw_text = raw_text.split("\n", 1)[1].rsplit("```", 1)[0].strip()
            data = json.loads(raw_text)
            validated = AIOutputSchema.model_validate(data)
            return validated
        except (ValidationError, json.JSONDecodeError, ValueError) as e:
            logger.warning(
                f"Gemini output validation failed (attempt {attempt + 1}): {e}"
            )
            if attempt == 1:
                raise ValueError(
                    f"Gemini returned invalid output after 2 attempts: {e}"
                )
            continue
