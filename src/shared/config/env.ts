import { z } from 'zod';

const envSchema = z.object({
  VITE_APP_ENV: z.enum(['local', 'test', 'staging', 'production']).default('local'),
  VITE_API_BASE_URL: z.string().default(''),
  VITE_SOCKET_URL: z.string().default(''),
  VITE_GOOGLE_CLIENT_ID: z.string().default(''),
  VITE_RELEASE: z.string().default('local'),
  VITE_SENTRY_DSN: z.string().default(''),
  VITE_ENABLE_MOCK: z
    .enum(['true', 'false'])
    .default('false')
    .transform((value) => value === 'true'),
  VITE_API_TIMEOUT_MS: z.coerce.number().int().positive().default(15_000),
});

export const env = envSchema.parse(import.meta.env);
