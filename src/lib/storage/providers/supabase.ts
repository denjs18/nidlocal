import type { UploadResult } from "../index";

const SUPABASE_URL = process.env.SUPABASE_URL!;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const BUCKET = process.env.STORAGE_BUCKET ?? "nidlocal-media";

export async function uploadToSupabase(
  buffer: Buffer,
  filename: string,
  contentType: string,
  folder: string
): Promise<UploadResult> {
  const key = `${folder}/${filename}`;
  const url = `${SUPABASE_URL}/storage/v1/object/${BUCKET}/${key}`;

  const res = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${SUPABASE_KEY}`,
      "Content-Type": contentType,
    },
    body: buffer,
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Supabase upload failed: ${err}`);
  }

  const publicUrl = `${SUPABASE_URL}/storage/v1/object/public/${BUCKET}/${key}`;
  return { url: publicUrl, key };
}

export async function deleteFromSupabase(key: string): Promise<void> {
  const url = `${SUPABASE_URL}/storage/v1/object/${BUCKET}/${key}`;
  const res = await fetch(url, {
    method: "DELETE",
    headers: { Authorization: `Bearer ${SUPABASE_KEY}` },
  });
  if (!res.ok) {
    throw new Error(`Supabase delete failed: ${await res.text()}`);
  }
}
