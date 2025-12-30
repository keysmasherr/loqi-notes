import dotenv from 'dotenv';

dotenv.config();

export const config = {
  env: process.env.NODE_ENV || 'development',
  port: parseInt(process.env.PORT || '3001', 10),

  // Database
  database: {
    url: process.env.DATABASE_URL!,
  },

  // Supabase
  supabase: {
    url: process.env.SUPABASE_URL!,
    anonKey: process.env.SUPABASE_ANON_KEY!,
    serviceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY!,
  },

  // AI Configuration
  ai: {
    anthropic: {
      apiKey: process.env.ANTHROPIC_API_KEY!,
      defaultModel: process.env.AI_DEFAULT_MODEL || 'claude-3-haiku-20240307',
      advancedModel: process.env.AI_ADVANCED_MODEL || 'claude-3-sonnet-20240229',
    },
    openai: {
      apiKey: process.env.OPENAI_API_KEY!,
      embeddingModel: process.env.EMBEDDING_MODEL || 'text-embedding-3-small',
      embeddingDimensions: 1536,
    },
  },

  // Inngest
  inngest: {
    eventKey: process.env.INNGEST_EVENT_KEY,
    signingKey: process.env.INNGEST_SIGNING_KEY,
  },

  // AI Query Limits
  limits: {
    free: {
      aiQueriesPerMonth: 50,
      storageBytes: 100 * 1024 * 1024, // 100MB
    },
    basic: {
      aiQueriesPerMonth: 200,
      storageBytes: 500 * 1024 * 1024, // 500MB
    },
    pro: {
      aiQueriesPerMonth: 1000,
      storageBytes: 5 * 1024 * 1024 * 1024, // 5GB
    },
  },
} as const;

// Validate required environment variables
const requiredEnvVars = [
  'DATABASE_URL',
  'SUPABASE_URL',
  'SUPABASE_ANON_KEY',
  'SUPABASE_SERVICE_ROLE_KEY',
  'ANTHROPIC_API_KEY',
  'OPENAI_API_KEY',
];

for (const envVar of requiredEnvVars) {
  if (!process.env[envVar]) {
    throw new Error(`Missing required environment variable: ${envVar}`);
  }
}
