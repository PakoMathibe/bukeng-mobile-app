# Bukeng Architecture

## Layer Structure
- `app/` - UI only (pages, layouts)
- `domains/` - Business logic
- `modules/` - Reusable engines
- `services/` - External integrations
- `hooks/` - React hooks bridging UI and domains
- `store/` - Zustand state management

## Data Flow
UI → Hook → Domain → Service → External API

## Environment Variables
See `.env.example` for required variables.