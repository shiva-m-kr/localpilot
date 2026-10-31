import { z } from 'zod';
import dotenv from 'dotenv';
import path from 'path';

// Load .env file safely if present
dotenv.config({ path: path.resolve(process.cwd(), '.env') });
dotenv.config({ path: path.resolve(process.cwd(), '../../.env') });

export const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().default(3000),
  WORKER_PORT: z.coerce.number().default(3001),
  
  DATABASE_URL: z.string().default('postgresql://localpilot:localpilot@localhost:5432/localpilot_dev'),
  DATABASE_DIRECT_URL: z.string().default('postgresql://localpilot:localpilot@localhost:5432/localpilot_dev'),
  
  SESSION_SECRET: z.string().min(32).default('localpilot-development-session-secret-at-least-32-chars-long'),
  INTEGRATION_ENCRYPTION_KEY: z.string().min(32).default('0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef'),
  
  R2_ACCOUNT_ID: z.string().optional().default('mock-r2-account-id'),
  R2_ACCESS_KEY_ID: z.string().optional().default('mock-r2-access-key'),
  R2_SECRET_ACCESS_KEY: z.string().optional().default('mock-r2-secret-key'),
  R2_BUCKET_NAME: z.string().optional().default('localpilot-media-dev'),
  R2_PUBLIC_DOMAIN: z.string().url().optional().default('https://media.localpilot.dev'),
  
  // Optional third-party providers (strictly gated until explicitly provided)
  GOOGLE_CLIENT_ID: z.string().optional(),
  GOOGLE_CLIENT_SECRET: z.string().optional(),
  META_APP_ID: z.string().optional(),
  META_APP_SECRET: z.string().optional(),
  DATAFORSEO_LOGIN: z.string().optional(),
  DATAFORSEO_PASSWORD: z.string().optional(),
  GEMINI_API_KEY: z.string().optional(),
  RAZORPAY_KEY_ID: z.string().optional(),
  RAZORPAY_KEY_SECRET: z.string().optional()
});

export type Env = z.infer<typeof envSchema>;

let _env: Env | null = null;

export function getEnv(): Env {
  if (!_env) {
    const result = envSchema.safeParse(process.env);
    if (!result.success) {
      console.error('Environment validation failed:', result.error.format());
      throw new Error(`Invalid environment configuration: ${JSON.stringify(result.error.flatten().fieldErrors)}`);
    }
    _env = result.data;
  }
  return _env;
}
