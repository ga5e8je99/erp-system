import fs from "fs/promises";
import path from "path";
import { put as vercelBlobPut } from "@vercel/blob";
import { logger } from "@/lib/logger";

type PutBody = Parameters<typeof vercelBlobPut>[1];

export interface StoragePutOptions {
  contentType?: string;
  access?: "public";
}

/**
 * Universal file storage interface.
 * When BLOB_READ_WRITE_TOKEN is configured (e.g. in Vercel production),
 * files are stored remotely in Vercel Blob.
 * In local development, files are stored on disk in public/uploads/.
 *
 * @param file The file binary data (File, Blob, Buffer, or Uint8Array)
 * @param filename Desired filename
 * @param options Storage configuration options
 * @returns The resolved accessible public URL
 */
export async function put(
  file: File | Blob | Buffer | Uint8Array,
  filename: string,
  options?: StoragePutOptions
): Promise<string> {
  const token = process.env.BLOB_READ_WRITE_TOKEN;

  if (token) {
    try {
      const body: PutBody =
        file instanceof Uint8Array && !Buffer.isBuffer(file)
          ? Buffer.from(file)
          : (file as PutBody);

      const blob = await vercelBlobPut(filename, body, {
        access: options?.access || "public",
        addRandomSuffix: false,
        contentType: options?.contentType,
        token,
      });
      return blob.url;
    } catch (error) {
      logger.error({ err: error, filename }, "Vercel Blob storage upload failed");
      throw error;
    }
  }

  // Local filesystem storage for development / self-hosted
  const uploadsDir = path.join(process.cwd(), "public", "uploads");
  await fs.mkdir(uploadsDir, { recursive: true });

  const filePath = path.join(uploadsDir, filename);

  const buffer = Buffer.isBuffer(file)
    ? file
    : file instanceof Uint8Array
      ? Buffer.from(file)
      : Buffer.from(await (file as Blob).arrayBuffer());

  await fs.writeFile(filePath, buffer);

  return `/uploads/${filename}`;
}
