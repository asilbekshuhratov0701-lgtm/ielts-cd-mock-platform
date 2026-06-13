# IELTS Computer-Delivered Mock Platform — Architecture Blueprint

A production-grade IELTS CD mock-exam platform: **Listening, Reading, Writing** (no
Speaking). Automatic L/R scoring, examiner-marked Writing, a full admin CMS, and an
AI-assisted exam-import pipeline (Anthropic Claude) under strict admin review.

> This `/docs` set is the developer-facing blueprint. The repository also contains a
> runnable monorepo **skeleton** (no business logic yet) — see [10-folder-structure.md](10-folder-structure.md).

## Read in order

| # | Doc | What it covers |
|---|-----|----------------|
| 00 | [Overview & Tech Stack](00-overview-and-tech-stack.md) | Goals, stack, guiding principles, technology recommendations |
| 01 | [Sitemap & Pages](01-sitemap-and-pages.md) | Full sitemap + complete page list |
| 02 | [Flows](02-flows.md) | Auth / candidate / admin / exam / AI data-flow diagrams |
| 03 | [Database ERD](03-database-erd.md) | ERD, tables, scoring rules |
| 04 | [API Spec](04-api-spec.md) | REST endpoint structure |
| 05 | [Frontend Architecture](05-frontend-architecture.md) | Rendering strategy, component hierarchy, exam runner |
| 06 | [Backend Architecture](06-backend-architecture.md) | Layers, services, worker, jobs, data flow |
| 07 | [AI Import Pipeline](07-ai-import-pipeline.md) | Hybrid parse → OCR → Claude → review |
| 08 | [Security & Auth](08-security-and-auth.md) | Auth flow, security architecture, exam integrity |
| 09 | [Deployment](09-deployment.md) | Infra, CI/CD, environments |
| 10 | [Folder Structure](10-folder-structure.md) | Monorepo layout |
| 11 | [Admin CMS](11-admin-cms.md) | Admin layout, dashboards, Live Exam Center, notifications |
| 12 | [Future Scalability](12-future-scalability.md) | Scaling & extensibility |
| 13 | [CD UX Spec](13-cd-ux-spec.md) | Official Computer-Delivered behaviours |
| 14 | [Backup & DR](14-backup-dr.md) | Backups, restore, disaster recovery |
| 15 | [Extensions E1–E14](15-extensions.md) | Templates, content library, groups, versioning, recovery, … |

## Where the 19 required outputs live

| Required output | Document |
|---|---|
| 1. Full sitemap | 01 |
| 2. User flows | 02 |
| 3. Admin flows | 02 |
| 4. Candidate flows | 02 |
| 5. Complete page list | 01 |
| 6. UI component hierarchy | 05 |
| 7. Database ERD | 03 |
| 8. Backend architecture | 06 |
| 9. Frontend architecture | 05 |
| 10. API endpoint structure | 04 |
| 11. Authentication flow | 08 |
| 12. Exam workflow | 02 + 13 |
| 13. Folder structure | 10 |
| 14. Deployment architecture | 09 |
| 15. Security architecture | 08 |
| 16. Admin CMS architecture | 11 |
| 17. Data flow diagrams | 02 + 06 + 07 |
| 18. Technology recommendations | 00 |
| 19. Future scalability | 12 |
| AI-assisted exam import | 07 |
