import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { requirePermission } from "@/lib/rbac";
import fs from "fs/promises";
import path from "path";

export const dynamic = "force-dynamic";

const MIME_TO_EXT: Record<string, string> = {
  "image/png": ".png",
  "image/jpeg": ".jpg",
  "image/jpg": ".jpg",
  "image/webp": ".webp",
  "image/svg+xml": ".svg",
};

const ALLOWED_MIME_TYPES = Object.keys(MIME_TO_EXT);
const MAX_FILE_SIZE_BYTES = 2 * 1024 * 1024; // 2MB

const DANGEROUS_SVG_PATTERNS = [
  /<script/i,
  /javascript:/i,
  /data:\s*text\/html/i,
  /onload\s*=/i,
  /onerror\s*=/i,
  /onclick\s*=/i,
  /onmouseover\s*=/i,
  /onfocus\s*=/i,
  /<iframe/i,
  /<embed/i,
  /<object/i,
  /<foreignObject/i,
];

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

    if (!ALLOWED_MIME_TYPES.includes(file.type)) {
      return NextResponse.json(
        { ok: false, error: "Invalid file type. Allowed: PNG, JPEG, WebP, SVG." },
        { status: 400 }
      );
    }

    if (file.size > MAX_FILE_SIZE_BYTES) {
      return NextResponse.json(
        { ok: false, error: "File exceeds maximum size of 2MB." },
        { status: 400 }
      );
    }

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    // Sanitize SVG files against script injection / XSS
    if (file.type === "image/svg+xml") {
      const content = buffer.toString("utf-8");
      for (const pattern of DANGEROUS_SVG_PATTERNS) {
        if (pattern.test(content)) {
          return NextResponse.json(
            { ok: false, error: "SVG contains unsafe scripts or executable elements." },
            { status: 400 }
          );
        }
      }
    }

    const uploadsDir = path.join(process.cwd(), "public", "uploads");
    await fs.mkdir(uploadsDir, { recursive: true });

    // Derive extension strictly from MIME type to prevent extension spoofing
    const ext = MIME_TO_EXT[file.type] || ".png";
    const filename = `logo-${Date.now()}-${Math.random().toString(36).slice(2, 8)}${ext}`;
    const filePath = path.join(uploadsDir, filename);

    await fs.writeFile(filePath, buffer);

    const publicUrl = `/uploads/${filename}`;
    return NextResponse.json({ ok: true, url: publicUrl });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Upload failed";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
