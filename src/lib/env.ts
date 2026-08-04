import { z } from "zod";

/**
 * Client-safe environment variables (exposed to the browser).
 * Next.js inlines NEXT_PUBLIC_* at build time, so these must be
 * referenced explicitly rather than dynamically.
 */
const clientEnvSchema = z.object({
  NEXT_PUBLIC_SUPABASE_URL: z.url({
    message: "NEXT_PUBLIC_SUPABASE_URL must be a valid URL",
  }),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z
    .string()
    .min(1, "NEXT_PUBLIC_SUPABASE_ANON_KEY is required"),
});

/**
 * Server-only environment variables. Never import serverEnv from a
 * client component — it will throw at build/runtime by design.
 */
const serverEnvSchema = z.object({
  DATABASE_URL: z
    .string()
    .min(1, "DATABASE_URL is required (Supabase pooled connection string)"),
  SUPABASE_SERVICE_ROLE_KEY: z
    .string()
    .min(1, "SUPABASE_SERVICE_ROLE_KEY is required"),
});

function formatEnvError(error: z.ZodError): string {
  const issues = error.issues
    .map((issue) => `  - ${issue.path.join(".")}: ${issue.message}`)
    .join("\n");
  return `Invalid environment configuration:\n${issues}`;
}

function parseClientEnv(): z.infer<typeof clientEnvSchema> {
  const result = clientEnvSchema.safeParse({
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
    NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  });
  if (!result.success) {
    throw new Error(formatEnvError(result.error));
  }
  return result.data;
}

export const clientEnv = parseClientEnv();

let cachedServerEnv: z.infer<typeof serverEnvSchema> | null = null;

export function getServerEnv(): z.infer<typeof serverEnvSchema> {
  if (typeof window !== "undefined") {
    throw new Error("getServerEnv() must not be called in the browser");
  }
  if (cachedServerEnv) {
    return cachedServerEnv;
  }
  const result = serverEnvSchema.safeParse({
    DATABASE_URL: process.env.DATABASE_URL,
    SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY,
  });
  if (!result.success) {
    throw new Error(formatEnvError(result.error));
  }
  cachedServerEnv = result.data;
  return cachedServerEnv;
}
