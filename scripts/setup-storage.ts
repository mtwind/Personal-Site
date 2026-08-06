import { config } from "dotenv";
import { createClient } from "@supabase/supabase-js";

config({ path: ".env.local" });

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const secretKey = process.env.SUPABASE_SECRET_KEY;
if (!url || !secretKey) {
  throw new Error("NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SECRET_KEY required");
}

interface BucketSpec {
  name: string;
  allowedMimeTypes: string[];
  description: string;
}

const BUCKETS: BucketSpec[] = [
  {
    name: "media",
    allowedMimeTypes: [
      "image/jpeg",
      "image/png",
      "image/webp",
      "image/gif",
      "image/avif",
    ],
    description: "images, 5MB limit",
  },
  {
    name: "resume",
    allowedMimeTypes: ["application/pdf"],
    description: "PDF only, 5MB limit",
  },
];

async function main(): Promise<void> {
  const storage = createClient(url!, secretKey!, {
    auth: { persistSession: false },
  }).storage;

  const { data: existing, error: listError } = await storage.listBuckets();
  if (listError) throw new Error(`listBuckets failed: ${listError.message}`);
  const existingNames = new Set(existing.map((bucket) => bucket.name));

  for (const spec of BUCKETS) {
    if (existingNames.has(spec.name)) {
      console.log(`Bucket "${spec.name}" already exists — skipping.`);
      continue;
    }
    const { error } = await storage.createBucket(spec.name, {
      public: true,
      fileSizeLimit: "5MB",
      allowedMimeTypes: spec.allowedMimeTypes,
    });
    if (error) {
      throw new Error(`createBucket ${spec.name} failed: ${error.message}`);
    }
    console.log(`Created public bucket "${spec.name}" (${spec.description}).`);
  }
}

main().catch((err: unknown) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
