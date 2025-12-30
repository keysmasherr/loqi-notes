# LoqiNotes

> **Notes that think.** An AI-native note-taking system with longitudinal memory, semantic search, and learning-first workflows.

## Overview

LoqiNotes is a modern note-taking application that transforms passive note storage into active cognition through:

- **Semantic Search** - RAG-powered search across all your notes using vector embeddings
- **AI Intelligence** - Summarize, explain, and generate questions from your notes
- **Spaced Repetition** - SM-2 algorithm for optimized learning and retention
- **Quiz Generation** - Auto-generate quizzes from your notes with multiple difficulty levels
- **Handwriting Support** - OCR text extraction from handwritten notes

## Tech Stack

### Backend
- **Runtime:** Node.js 18.20.0
- **Framework:** Express + tRPC for type-safe APIs
- **Language:** TypeScript (strict mode)
- **Database:** Supabase Postgres with pgvector for embeddings
- **ORM:** Drizzle ORM
- **AI:** Anthropic Claude (Haiku/Sonnet), OpenAI Embeddings
- **Monorepo:** Turborepo with pnpm workspaces

### Project Structure

```
loqi-notes/
├── apps/
│   ├── api/              # Backend API (tRPC + Express)
│   └── mobile/           # Mobile app (Phase 2 - placeholder)
├── packages/
│   ├── shared-types/     # Shared TypeScript types and Zod schemas
│   └── eslint-config/    # Shared ESLint configuration
├── postman/              # Postman API collection
└── docs/                 # Documentation (gitignored)
```

## Quick Start

### Prerequisites

- Node.js 18.20.0
- pnpm 8.15.0
- Supabase account with configured database
- API keys for Anthropic and OpenAI

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/yourusername/loqi-notes.git
   cd loqi-notes
   ```

2. **Install dependencies**
   ```bash
   pnpm install
   ```

3. **Set up environment variables**
   ```bash
   cp .env.example .env
   ```

   Edit `.env` with your credentials:
   - `DATABASE_URL` - Your Supabase Postgres connection string
   - `SUPABASE_URL` - Your Supabase project URL
   - `SUPABASE_ANON_KEY` - Your Supabase anon key
   - `SUPABASE_SERVICE_ROLE_KEY` - Your Supabase service role key
   - `ANTHROPIC_API_KEY` - Your Anthropic API key
   - `OPENAI_API_KEY` - Your OpenAI API key

4. **Build shared packages**
   ```bash
   pnpm --filter @loqi-notes/shared-types build
   ```

5. **Generate Drizzle client**
   ```bash
   pnpm --filter @loqi-notes/api db:generate
   ```

6. **Start development server**
   ```bash
   pnpm --filter @loqi-notes/api dev
   ```

The API will be available at:
- **Base URL:** `http://localhost:3001`
- **Health Check:** `http://localhost:3001/health`
- **tRPC Endpoint:** `http://localhost:3001/api/v1/trpc`

### Database Setup

The database schema is already loaded in your Supabase project. To view the schema or make migrations:

```bash
# View schema in Drizzle Studio
pnpm --filter @loqi-notes/api db:studio

# Push schema changes to database
pnpm --filter @loqi-notes/api db:push
```

## Available Scripts

### Root Level
```bash
pnpm dev          # Start all apps in development mode
pnpm build        # Build all apps
pnpm test         # Run all tests
pnpm lint         # Lint all packages
pnpm format       # Format code with Prettier
pnpm typecheck    # Type check all packages
pnpm clean        # Clean all build artifacts
```

### API Package
```bash
pnpm --filter @loqi-notes/api dev           # Start dev server
pnpm --filter @loqi-notes/api build         # Build for production
pnpm --filter @loqi-notes/api test          # Run tests
pnpm --filter @loqi-notes/api lint          # Lint code
pnpm --filter @loqi-notes/api typecheck     # Type check
pnpm --filter @loqi-notes/api db:generate   # Generate Drizzle migrations
pnpm --filter @loqi-notes/api db:push       # Push schema to database
pnpm --filter @loqi-notes/api db:studio     # Open Drizzle Studio
pnpm --filter @loqi-notes/api db:seed       # Seed test data
```

## API Testing

Use the Postman collection in the `postman/` directory to test API endpoints:

1. Import `postman/loqi-notes-collection.json` into Postman
2. Set environment variables (base URL, auth token)
3. Test available endpoints

## Project Features

### Implemented
- ✅ Monorepo setup with Turborepo
- ✅ Express + tRPC API server
- ✅ Drizzle ORM with Postgres
- ✅ Type-safe API with shared types
- ✅ Authentication with Supabase
- ✅ Error handling and logging
- ✅ Database schema for all features

### In Development
- 🚧 Notes CRUD operations
- 🚧 Tags management
- 🚧 Semantic search with embeddings
- 🚧 AI features (summarize, explain, quiz)
- 🚧 Spaced repetition system
- 🚧 Background job processing

## Database Schema

The database includes the following main tables:

- **users** - User profiles, subscription tiers, and usage tracking
- **notes** - Core note content with versioning and sync support
- **tags** - User-created tags for organizing notes
- **embeddings** - Vector embeddings for semantic search
- **quizzes** - Generated quizzes with questions
- **review_schedules** - Spaced repetition scheduling (SM-2)
- **ai_logs** - AI usage tracking and debugging

For detailed schema information, see the Drizzle schema files in `apps/api/src/db/schema/`.

## Architecture Decisions

### Type Safety
- Zod schemas in shared-types package for runtime validation
- TypeScript strict mode throughout
- tRPC for end-to-end type safety

### Authentication
- Supabase Auth for user management
- JWT token verification in tRPC context
- Row Level Security (RLS) in database

### AI Integration
- Claude Haiku for fast, cost-effective operations
- Claude Sonnet for advanced/complex operations
- OpenAI embeddings for semantic search

### Code Organization
- Feature-based folder structure
- Separation of router (API layer) and service (business logic)
- Shared types package for consistency

## Development Guidelines

1. **Always check authentication** - Use `protectedProcedure` for authenticated routes
2. **User scoping** - Always filter queries by `user_id`
3. **Soft deletes** - Use `deleted_at IS NULL` in queries
4. **Error handling** - Throw custom `AppError` subclasses
5. **Logging** - Log all AI operations for cost tracking
6. **Testing** - Mock external APIs in tests

## Contributing

This is a portfolio project. Contributions are welcome but please open an issue first to discuss proposed changes.

## License

MIT

## Contact

For questions or feedback, please open an issue on GitHub.