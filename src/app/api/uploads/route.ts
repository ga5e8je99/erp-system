import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { auth } from "@/lib/auth";
import { requirePermission } from "@/lib/rbac";
import { logger } from "@/lib/logger";
import { put } from "@/lib/storage";
import { detectImageMagicBytes, type AllowedMimeType } from "@/lib/image-validation";

export const dynamic = "force-dynamic";

const ALLOWED_MIME_TYPES: readonly string[] = [
  "image/png",
  "image/jpeg",
  "image/jpg",
  "image/webp",
];

const MAX_FILE_SIZE_BYTES = 2 * 1024 * 1024; // 2MB

const MIME_TO_EXT: Record<AllowedMimeType, string> = {
  "image/png": ".png",
  "image/jpeg": ".jpg",
  "image/webp": ".webp",
};

export async function POST(request: NextRequest) {
  try {
    // CSRF Origin verification if Origin header is provided
    const origin = request.headers.get("origin");
    const host = request.headers.get("host");
    if (origin && host) {
      try {
        const originUrl = new URL(origin);
        if (originUrl.host !== host) {
          return NextResponse.json({ ok: false, error: "Invalid Origin header" }, { status: 403 });
        }
      } catch {
        return NextResponse.json({ ok: false, error: "Malformed Origin header" }, { status: 403 });
      }
    }

    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
    }

    await requirePermission("company.settings.manage");

    const formData = await request.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return NextResponse.json({ ok: false, error: "No file provided" }, { status: 400 });
    }

    // 1. Initial MIME type check against allowed list (SVG is strictly dropped)
    if (!ALLOWED_MIME_TYPES.includes(file.type.toLowerCase())) {
      return NextResponse.json(
        { ok: false, error: "Invalid file type. Only PNG, JPEG, and WebP images are allowed." },
        { status: 400 }
      );
    }

    // 2. File size enforcement
    if (file.size > MAX_FILE_SIZE_BYTES) {
      return NextResponse.json(
        { ok: false, error: "File exceeds maximum size of 2MB." },
        { status: 400 }
      );
    }

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    // 3. Strict magic bytes inspection (prevents MIME spoofing)
    const detectedMime = detectImageMagicBytes(buffer);
    const normalizedDeclaredMime = file.type.toLowerCase() === "image/jpg" ? "image/jpeg" : file.type.toLowerCase();

    if (!detectedMime || detectedMime !== normalizedDeclaredMime) {
      return NextResponse.json(
        { ok: false, error: "Invalid file content or spoofed MIME type. Only genuine PNG, JPEG, and WebP files are permitted." },
        { status: 400 }
      );
    }

    // 4. Generate cryptographically safe unique filename
    const ext = MIME_TO_EXT[detectedMime];
    const uniqueSuffix = crypto.randomBytes(8).toString("hex");
    const filename = `logo-${Date.now()}-${uniqueSuffix}${ext}`;

    // 5. Store file via storage layer (Vercel Blob in cloud, local disk in dev)
    const publicUrl = await put(buffer, filename, {
      contentType: detectedMime,
      access: "public",
    });

    return NextResponse.json({ ok: true, url: publicUrl });
  } catch (error: unknown) {
    logger.error({ err: error }, "File upload processing failed");
    return NextResponse.json({ ok: false, error: "Upload failed" }, { status: 500 });
  }
}
