// Couche d'abstraction du stockage de fichiers
// Supporte Supabase Storage et Cloudflare R2 (S3-compatible)

const provider = process.env.STORAGE_PROVIDER ?? "supabase";

export interface UploadResult {
  url: string;
  key: string;
}

/**
 * Upload un fichier et retourne son URL publique.
 */
export async function uploadFile(
  buffer: Buffer,
  filename: string,
  contentType: string,
  folder: string = "uploads"
): Promise<UploadResult> {
  if (provider === "supabase") {
    const { uploadToSupabase } = await import("./providers/supabase");
    return uploadToSupabase(buffer, filename, contentType, folder);
  }
  // Fallback S3/R2
  const { uploadToS3 } = await import("./providers/s3");
  return uploadToS3(buffer, filename, contentType, folder);
}

/**
 * Supprime un fichier par sa clé.
 */
export async function deleteFile(key: string): Promise<void> {
  if (provider === "supabase") {
    const { deleteFromSupabase } = await import("./providers/supabase");
    return deleteFromSupabase(key);
  }
  const { deleteFromS3 } = await import("./providers/s3");
  return deleteFromS3(key);
}

/**
 * Génère un nom de fichier unique.
 */
export function generateFilename(originalName: string, prefix?: string): string {
  const ext = originalName.split(".").pop() ?? "jpg";
  const timestamp = Date.now();
  const random = Math.random().toString(36).slice(2, 8);
  return prefix
    ? `${prefix}-${timestamp}-${random}.${ext}`
    : `${timestamp}-${random}.${ext}`;
}
