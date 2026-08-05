import { config } from "dotenv";
import { createClient } from "@supabase/supabase-js";

config({ path: ".env.local" });

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const secretKey = process.env.SUPABASE_SECRET_KEY;
if (!url || !secretKey) {
  throw new Error("NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SECRET_KEY required");
}

const MEDIA_BUCKET = "media";

async function main(): Promise<void> {
  const storage = createClient(url!, secretKey!, {
    auth: { persistSession: false },
  }).storage;

  const { data: buckets, error: listError } = await storage.listBuckets();
  if (listError) throw new Error(`listBuckets failed: ${listError.message}`);

  if (buckets.some((bucket) => bucket.name === MEDIA_BUCKET)) {
    console.log(`Bucket "${MEDIA_BUCKET}" already exists — nothing to do.`);
    return;
  }

  const { error } = await storage.createBucket(MEDIA_BUCKET, {
    public: true,
    fileSizeLimit: "5MB",
    allowedMimeTypes: [
      "image/jpeg",
      "image/png",
      "image/webp",
      "image/gif",
      "image/avif",
    ],
  });
  if (error) throw new Error(`createBucket failed: ${error.message}`);
  console.log(`Created public bucket "${MEDIA_BUCKET}" (images, 5MB limit).`);
}

main().catch((err: unknown) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
