# CloudArch AI 🚀

An AI-powered SaaS platform designed to automate the process of generating production-ready, secure, and optimized AWS infrastructure blueprints. By analyzing plain-language application descriptions and requirements, CloudArch AI instantly compiles tailored architecture topologies (Startup, Production, Enterprise Tiers) complete with visual node diagrams, estimated monthly costs, security guidelines, and step-by-step deployment tutorials.

Live demo: https://d1aehhalapvmfv.cloudfront.net

---

## 💡 Tech Stack
A modern stack designed for high availability, security, and responsive user experience:

| Tier | Component | Technology | Description |
|---|---|---|---|
| **Frontend** | UI & Layout | React (Vite) + Tailwind CSS v3 | Fast SPA loading, modern glassmorphism design, and responsive layout. |
| | Visual Diagrams | React Flow (xyflow) | Dynamic interactive canvas for drawing and configuring infrastructure topologies. |
| | State Management | Zustand | Lightweight global store for auth sessions and state caching. |
| **Backend** | REST API | FastAPI (Python 3.11) | High-performance, asynchronous endpoints with Pydantic type safety. |
| | Database ORM | SQLAlchemy + Alembic | Async engine with automated database schema migrations. |
| **AI** | Generation Model | Google Generative AI API | Structured JSON output parser for architecture schema compilation. |
| **Database** | Database Engine | PostgreSQL (Supabase) | Multi-tenant relational storage secured with Row Level Security (RLS). |

---

## ☁️ AWS Services Used
The application is designed to run natively on the AWS ecosystem and generates architectures featuring standard AWS services:

1. **AWS Cognito**: Provides user pools, user signups, and secure JWT-based token authentication for access control.
2. **Amazon S3**: Hosts the frontend static single-page application (SPA) and archives generated architecture JSON reports privately.
3. **Amazon CloudFront**: Global Content Delivery Network (CDN) utilizing Origin Access Control (OAC) to serve frontend assets securely.
4. **Target Architectures**: Generates AWS architectures incorporating services such as **EC2**, **ECS**, **EKS**, **RDS**, **DynamoDB**, **Lambda**, **API Gateway**, **Route 53**, and **SES** mapped directly to AWS Free Tier boundaries.

---

## 📂 File Structure

```
├── backend/                  # FastAPI Application
│   ├── app/
│   │   ├── auth/             # Cognito JWT verification and dependencies
│   │   ├── models/           # SQLAlchemy schemas (Projects, Architectures)
│   │   ├── routes/           # REST endpoints (Projects, Health)
│   │   ├── schemas/          # Pydantic schemas (validation layer)
│   │   ├── services/         # Third-party integrations (AI Engine, S3, Diagram Builder)
│   │   ├── config.py         # Application settings (Pydantic BaseSettings)
│   │   └── database.py       # Async engine configuration
│   ├── alembic/              # DB migration logs
│   ├── requirements.txt      # Python dependencies
│   └── Procfile              # Render deployment configuration
│
├── frontend/                 # React Vite Application
│   ├── src/
│   │   ├── components/       # Layouts, Sidebar, and Shared UI elements
│   │   ├── hooks/            # Custom React hooks (Cognito Auth wrapper)
│   │   ├── pages/            # View pages (Landing, Dashboard, NewProject, Details)
│   │   ├── services/         # Axios API clients
│   │   ├── store/            # Zustand auth state persisted in localStorage
│   │   └── main.jsx          # App entrypoint
│   ├── public/               # Public assets (Logo, Favicons)
│   └── index.html            # Primary SPA HTML wrapper
```

---

## 🔮 Future Development Scope

1. **One-Click Terraform Deployment**: Allow users to download ready-to-run Terraform files for the generated architecture or deploy them directly from the dashboard.
2. **Infrastructure Cost Optimization (FinOps)**: Add budget tracking alerts and automated cost recommendations for AWS architectures.
3. **Interactive Diagram Editor**: Allow users to drag, drop, connect, and configure additional AWS services directly on the canvas to customize generated blueprints.
4. **Integrations & Notifications**: Slack/Discord webhook alerts when an architecture generation finishes, with downloadable PDF design reports.
5. **Team Collaboration**: Shared workspaces where architects and developers can collaborate, comment on, and version control architecture diagrams together.
6. **SaaS Premium Tiering**: Stripe integration to monetize enterprise-tier generation, PDF reports, and Terraform exports.
