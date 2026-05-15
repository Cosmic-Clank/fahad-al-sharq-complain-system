import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PRIVATE_SUPABASE_SECRET_DEFAULT_KEY,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

const ONE_MONTH_AGO = new Date();
ONE_MONTH_AGO.setMonth(ONE_MONTH_AGO.getMonth() - 1);

async function listAllFilesRecursive(bucket, folder = "") {
  const allFiles = [];
  let offset = 0;
  const limit = 100;

  while (true) {
    const { data, error } = await supabase.storage
      .from(bucket)
      .list(folder, { limit, offset });

    if (error) {
      console.error(`Error listing ${bucket}/${folder}:`, error.message);
      break;
    }
    if (!data || data.length === 0) break;

    for (const item of data) {
      const fullPath = folder ? `${folder}/${item.name}` : item.name;
      if (item.id) {
        allFiles.push({ ...item, fullPath });
      } else {
        const nested = await listAllFilesRecursive(bucket, fullPath);
        allFiles.push(...nested);
      }
    }
    offset += limit;
  }
  return allFiles;
}

async function main() {
  const { data: buckets, error } = await supabase.storage.listBuckets();
  if (error) {
    console.error("Failed to list buckets:", error.message);
    process.exit(1);
  }

  console.log(`Found ${buckets.length} bucket(s): ${buckets.map((b) => b.name).join(", ")}`);
  console.log(`Cutoff: ${ONE_MONTH_AGO.toISOString()}\n`);

  let totalDeleted = 0;

  for (const bucket of buckets) {
    console.log(`=== ${bucket.name} ===`);
    const files = await listAllFilesRecursive(bucket.name);

    const oldFiles = files.filter((f) => new Date(f.created_at) < ONE_MONTH_AGO);
    console.log(`  ${files.length} total, ${oldFiles.length} older than 1 month`);

    if (oldFiles.length === 0) continue;

    // preview what's getting deleted
    console.log("  Deleting:");
    oldFiles.forEach((f) => console.log(`    - ${f.fullPath}  (${f.created_at})`));

    const batchSize = 500;
    for (let i = 0; i < oldFiles.length; i += batchSize) {
      const batch = oldFiles.slice(i, i + batchSize).map((f) => f.fullPath);
      const { error: delErr } = await supabase.storage.from(bucket.name).remove(batch);

      if (delErr) {
        console.error(`  Delete error:`, delErr.message);
      } else {
        totalDeleted += batch.length;
        console.log(`  Deleted batch ${Math.floor(i / batchSize) + 1} (${batch.length} files)`);
      }
    }
  }

  console.log(`\nTotal deleted: ${totalDeleted} files`);
}

main().catch(console.error);