# LoqiNotes - Project Structure Overview

## Directory Tree

```
loqi-notes/
│
├── 📦 apps/
│   ├── 🔧 api/                                 # Backend API Server
│   │   ├── src/
│   │   │   ├── config/
│   │   │   │   └── index.ts                    # Environment configuration
│   │   │   │
│   │   │   ├── db/
│   │   │   │   ├── index.ts                    # Database client
│   │   │   │   └── schema/                     # Drizzle ORM schemas
│   │   │   │       ├── users.ts                # User profiles
│   │   │   │       ├── notes.ts                # Notes & conflicts
│   │   │   │       ├── tags.ts                 # Tags & note_tags
│   │   │   │       ├── embeddings.ts           # Vector embeddings
│   │   │   │       ├── quizzes.ts              # Quizzes & attempts
│   │   │   │       ├── review-schedules.ts     # Spaced repetition
│   │   │   │       ├── ai-logs.ts              # AI usage logs
│   │   │   │       └── index.ts                # Export all schemas
│   │   │   │
│   │   │   ├── features/                       # Feature modules
│   │   │   │   ├── auth/                       # ✅ Implemented
│   │   │   │   │   ├── router.ts               # Auth tRPC routes
│   │   │   │   │   └── service.ts              # Auth business logic
│   │   │   │   ├── notes/                      # 🚧 To implement
│   │   │   │   ├── tags/                       # 🚧 To implement
│   │   │   │   ├── embeddings/                 # 🚧 To implement
│   │   │   │   ├── search/                     # 🚧 To implement
│   │   │   │   ├── ai/                         # 🚧 To implement
│   │   │   │   ├── quiz/                       # 🚧 To implement
│   │   │   │   └── study/                      # 🚧 To implement
│   │   │   │
│   │   │   ├── lib/                            # External service clients
│   │   │   │   ├── supabase.ts                 # Supabase client
│   │   │   │   ├── anthropic.ts                # Claude AI client
│   │   │   │   ├── openai.ts                   # OpenAI embeddings
│   │   │   │   └── logger.ts                   # Pino logger
│   │   │   │
│   │   │   ├── middleware/
│   │   │   │   └── errorHandler.ts             # Global error handler
│   │   │   │
│   │   │   ├── trpc/                           # tRPC setup
│   │   │   │   ├── index.ts                    # tRPC initialization
│   │   │   │   ├── context.ts                  # Request context
│   │   │   │   └── router.ts                   # Root router
│   │   │   │
│   │   │   ├── utils/
│   │   │   │   └── errors.ts                   # Custom error classes
│   │   │   │
│   │   │   ├── jobs/                           # Background jobs (Inngest)
│   │   │   ├── index.ts                        # Server entry point
│   │   │   └── server.ts                       # Express + tRPC setup
│   │   │
│   │   ├── tests/
│   │   │   └── setup.ts                        # Jest configuration
│   │   │
│   │   ├── package.json                        # API dependencies
│   │   ├── tsconfig.json                       # TypeScript config
│   │   ├── drizzle.config.ts                   # Drizzle ORM config
│   │   └── jest.config.js                      # Jest config
│   │
│   └── 📱 mobile/                              # React Native app (Phase 2)
│       └── .gitkeep                            # Placeholder
│
├── 📦 packages/
│   ├── shared-types/                           # Shared TypeScript types
│   │   ├── src/
│   │   │   ├── user.ts                         # User types & schemas
│   │   │   ├── note.ts                         # Note types & schemas
│   │   │   ├── tag.ts                          # Tag types & schemas
│   │   │   ├── embedding.ts                    # Embedding types
│   │   │   ├── quiz.ts                         # Quiz types & schemas
│   │   │   ├── study.ts                        # Study types & schemas
│   │   │   ├── api.ts                          # API types & schemas
│   │   │   └── index.ts                        # Export all types
│   │   ├── package.json
│   │   └── tsconfig.json
│   │
│   └── eslint-config/                          # Shared ESLint config
│       ├── index.js                            # ESLint rules
│       └── package.json
│
├── 📮 postman/                                 # API testing
│   ├── loqi-notes-collection.json              # Postman collection
│   ├── loqi-notes-environment.json             # Environment variables
│   └── README.md                               # Postman guide
│
├── 📄 Configuration Files
│   ├── .env.example                            # Environment template
│   ├── .gitignore                              # Git ignore (docs/)
│   ├── .prettierrc                             # Prettier config
│   ├── package.json                            # Root package.json
│   ├── pnpm-workspace.yaml                     # pnpm workspaces
│   └── turbo.json                              # Turborepo config
│
└── 📚 Documentation
    ├── README.md                               # Main documentation
    ├── SETUP.md                                # Setup guide
    ├── PROJECT_STRUCTURE.md                    # This file
    └── docs/ (gitignored)                      # Internal docs
```

## Feature Status

| Feature | Router | Service | Schema | Types | Status |
|---------|--------|---------|--------|-------|--------|
| **Auth** | ✅ | ✅ | ✅ | ✅ | **Implemented** |
| **Notes** | 📁 | 📁 | ✅ | ✅ | Structure ready |
| **Tags** | 📁 | 📁 | ✅ | ✅ | Structure ready |
| **Embeddings** | 📁 | 📁 | ✅ | ✅ | Structure ready |
| **Search** | 📁 | 📁 | ✅ | ✅ | Structure ready |
| **AI** | 📁 | 📁 | ✅ | ✅ | Structure ready |
| **Quiz** | 📁 | 📁 | ✅ | ✅ | Structure ready |
| **Study** | 📁 | 📁 | ✅ | ✅ | Structure ready |

Legend: ✅ Done | 📁 Folder created | 🚧 In progress

## Technology Stack

### Backend
- **Runtime**: Node.js 23.3.0
- **Framework**: Express.js
- **API**: tRPC (type-safe)
- **Language**: TypeScript (strict)
- **Database**: Supabase Postgres + pgvector
- **ORM**: Drizzle ORM
- **Auth**: Supabase Auth (JWT)
- **Logging**: Pino
- **Testing**: Jest

### AI/ML
- **LLM**: Anthropic Claude (Haiku/Sonnet)
- **Embeddings**: OpenAI text-embedding-3-small
- **Vector Search**: pgvector

### DevOps
- **Monorepo**: Turborepo
- **Package Manager**: pnpm 9.12.3
- **Code Quality**: ESLint + Prettier
- **Background Jobs**: Inngest (configured)

## Code Organization Pattern

Each feature follows this structure:
```
features/
└── [feature-name]/
    ├── router.ts       # tRPC procedures (API layer)
    ├── service.ts      # Business logic (pure functions)
    └── types.ts        # Feature-specific types (if needed)
```

### Data Flow
```
Client Request
    ↓
tRPC Endpoint (router.ts)
    ↓
Input Validation (Zod schemas)
    ↓
Business Logic (service.ts)
    ↓
Database (Drizzle ORM)
    ↓
Response (type-safe)
```

## Key Endpoints

### Implemented
- `GET /health` - Health check
- `GET /api/v1/trpc/auth.getSession` - Get user session
- `GET /api/v1/trpc/auth.getProfile` - Get user profile
- `POST /api/v1/trpc/auth.updateProfile` - Update profile

### To Implement
- Notes CRUD: `notes.{create,list,getById,update,delete,restore}`
- Tags: `tags.{create,list,update,delete,addToNote,removeFromNote}`
- Search: `search.{semantic,fullText,hybrid}`
- AI: `ai.{summarize,explain,generateQuestions,ask}`
- Quiz: `quiz.{generate,getById,list,submitAttempt}`
- Study: `study.{getDueReviews,recordReview,getStats,getSchedule}`

## Environment Variables

Required for development:
```env
DATABASE_URL=postgresql://...
SUPABASE_URL=https://...
SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_ROLE_KEY=eyJ...
ANTHROPIC_API_KEY=sk-ant-...
OPENAI_API_KEY=sk-...
```

Optional:
```env
NODE_ENV=development
PORT=3001
LOG_LEVEL=info
AI_DEFAULT_MODEL=claude-3-haiku-20240307
AI_ADVANCED_MODEL=claude-3-sonnet-20240229
EMBEDDING_MODEL=text-embedding-3-small
```

## Development Workflow

1. **Start development server**
   ```bash
   pnpm --filter @loqi-notes/api dev
   ```

2. **Make changes** in feature folders

3. **Test with Postman** using the collection

4. **Write tests** in `apps/api/tests/`

5. **Run type checking**
   ```bash
   pnpm typecheck
   ```

6. **Lint and format**
   ```bash
   pnpm lint
   pnpm format
   ```

## Next Implementation Steps

1. **Notes CRUD** (Priority 1)
   - Create `apps/api/src/features/notes/router.ts`
   - Create `apps/api/src/features/notes/service.ts`
   - Add to root router in `apps/api/src/trpc/router.ts`
   - Test with Postman

2. **Tags Management** (Priority 2)
   - Similar structure as notes
   - Include note-tag associations

3. **Embeddings** (Priority 3)
   - Text chunking logic
   - OpenAI integration
   - Background job setup

4. **Search** (Priority 4)
   - Vector similarity search
   - Full-text search
   - Hybrid search

5. **AI Features** (Priority 5)
   - Anthropic Claude integration
   - Prompt templates
   - Usage tracking

6. **Quiz & Study** (Priority 6)
   - Quiz generation
   - SM-2 algorithm
   - Review scheduling

## File Count Summary

- **Total TypeScript files**: 32
- **Configuration files**: 9
- **Schema files**: 7
- **Type definition files**: 7
- **Test setup files**: 1
- **Documentation files**: 3

---

**Status**: ✅ Backend structure complete | 🚧 Feature implementation in progress

**Last Updated**: December 2024
