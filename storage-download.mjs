import { createClient } from "@supabase/supabase-js";
import fs from "fs";
import path from "path";
import { execSync } from "child_process";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PRIVATE_SUPABASE_SECRET_DEFAULT_KEY,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

const DOWNLOAD_DIR = "./storage-backup";

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

async function downloadFile(bucket, filePath, destDir) {
  const { data, error } = await supabase.storage.from(bucket).download(filePath);
  if (error) {
    console.error(`  FAIL ${filePath}: ${error.message}`);
    return false;
  }
  const dest = path.join(destDir, filePath);
  fs.mkdirSync(path.dirname(dest), { recursive: true });
  fs.writeFileSync(dest, Buffer.from(await data.arrayBuffer()));
  return true;
}

async function main() {
  const { data: buckets, error } = await supabase.storage.listBuckets();
  if (error) {
    console.error("Failed to list buckets:", error.message);
    process.exit(1);
  }

  console.log(`Found ${buckets.length} bucket(s): ${buckets.map((b) => b.name).join(", ")}\n`);
  fs.mkdirSync(DOWNLOAD_DIR, { recursive: true });

  let total = 0;

  for (const bucket of buckets) {
    console.log(`\n=== ${bucket.name} ===`);
    const files = await listAllFilesRecursive(bucket.name);
    console.log(`  ${files.length} file(s)`);

    const bucketDir = path.join(DOWNLOAD_DIR, bucket.name);
    for (const file of files) {
      process.stdout.write(`  ${file.fullPath} ...`);
      const ok = await downloadFile(bucket.name, file.fullPath, bucketDir);
      if (ok) { total++; console.log(" ok"); }
    }
  }

  console.log(`\nDownloaded ${total} files to ${DOWNLOAD_DIR}/`);
  console.log("Zipping...");
  try {
    execSync(`cd ${DOWNLOAD_DIR} && zip -r ../storage-backup.zip .`);
    console.log("Created storage-backup.zip");
  } catch {
    console.log("zip failed — manually zip the storage-backup/ folder");
  }
}

main().catch(console.error);