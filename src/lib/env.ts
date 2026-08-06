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
  /** Modern publishable key (sb_publishable_...), successor to `anon`. */
  NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: z
    .string()
    .min(1, "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY is required"),
});

/**
 * Server-only environment variables. Never import serverEnv from a
 * client component — it will throw at build/runtime by design.
 */
const serverEnvSchema = z.object({
  DATABASE_URL: z
    .string()
    .min(1, "DATABASE_URL is required (Supabase pooled connection string)"),
  /** Modern secret key (sb_secret_...), successor to `service_role`. */
  SUPABASE_SECRET_KEY: z.string().min(1, "SUPABASE_SECRET_KEY is required"),
  /** Brandfetch client id — optional; company autocomplete activates when set. */
  BRANDFETCH_CLIENT_ID: z.string().optional(),
  /** Resend API key — optional; feedback emails activate when set. */
  RESEND_API_KEY: z.string().optional(),
  /** Verified sender for Resend; onboarding@resend.dev works for testing. */
  RESEND_FROM: z.string().optional(),
  /** Where feedback notifications go; falls back to the contact email. */
  NOTIFY_EMAIL: z.email().optional(),
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
    NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY:
      process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
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
    SUPABASE_SECRET_KEY: process.env.SUPABASE_SECRET_KEY,
    BRANDFETCH_CLIENT_ID: process.env.BRANDFETCH_CLIENT_ID,
    RESEND_API_KEY: process.env.RESEND_API_KEY,
    RESEND_FROM: process.env.RESEND_FROM,
    NOTIFY_EMAIL: process.env.NOTIFY_EMAIL,
  });
  if (!result.success) {
    throw new Error(formatEnvError(result.error));
  }
  cachedServerEnv = result.data;
  return cachedServerEnv;
}
