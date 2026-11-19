import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";
import { POST } from "../route";
import { detectImageMagicBytes } from "@/lib/image-validation";

vi.mock("@/lib/auth", () => ({
  auth: vi.fn().mockResolvedValue({ user: { id: "user-admin" } }),
}));

vi.mock("@/lib/rbac", () => ({
  requirePermission: vi.fn().mockResolvedValue(true),
}));

vi.mock("@/lib/storage", () => ({
  put: vi.fn().mockResolvedValue("/uploads/logo-test-123.png"),
}));

describe("Uploads API Security (/api/uploads)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("detectImageMagicBytes", () => {
    it("identifies authentic PNG signatures", () => {
      const pngHeader = Buffer.from([
        0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00, 0x00, 0x00, 0x0d,
      ]);
      expect(detectImageMagicBytes(pngHeader)).toBe("image/png");
    });

    it("identifies authentic JPEG signatures", () => {
      const jpegHeader = Buffer.from([
        0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46, 0x49, 0x46, 0x00, 0x01,
      ]);
      expect(detectImageMagicBytes(jpegHeader)).toBe("image/jpeg");
    });

    it("identifies authentic WebP signatures", () => {
      // RIFF....WEBP
      const webpHeader = Buffer.from([
        0x52, 0x49, 0x46, 0x46, 0x24, 0x00, 0x00, 0x00, 0x57, 0x45, 0x42, 0x50,
      ]);
      expect(detectImageMagicBytes(webpHeader)).toBe("image/webp");
    });

    it("returns null for SVG or plain text", () => {
      const svgBuffer = Buffer.from("<svg xmlns='http://www.w3.org/2000/svg'></svg>");
      expect(detectImageMagicBytes(svgBuffer)).toBeNull();
    });
  });

  describe("POST /api/uploads", () => {
    it("rejects SVG files with HTTP 400", async () => {
      const svgContent = "<svg><script>alert(1)</script></svg>";
      const file = new File([svgContent], "logo.svg", { type: "image/svg+xml" });

      const formData = new FormData();
      formData.append("file", file);

      const request = new NextRequest("http://localhost:3000/api/uploads", {
        method: "POST",
        body: formData,
      });

      const response = await POST(request);
      expect(response.status).toBe(400);

      const body = await response.json();
      expect(body.ok).toBe(false);
      expect(body.error).toContain("Invalid file type");
    });

    it("rejects spoofed MIME type (text/html masquerading as image/png)", async () => {
      // Claiming to be image/png, but contents are HTML/JavaScript
      const maliciousPayload = "<script>stealCookies()</script>";
      const file = new File([maliciousPayload], "exploit.png", { type: "image/png" });

      const formData = new FormData();
      formData.append("file", file);

      const request = new NextRequest("http://localhost:3000/api/uploads", {
        method: "POST",
        body: formData,
      });

      const response = await POST(request);
      expect(response.status).toBe(400);

      const body = await response.json();
      expect(body.ok).toBe(false);
      expect(body.error).toContain("spoofed MIME");
    });

    it("accepts genuine PNG image with authentic magic bytes", async () => {
      // Minimal valid PNG header and chunk
      const validPngBytes = new Uint8Array([
        0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, // PNG signature
        0x00, 0x00, 0x00, 0x0d, 0x49, 0x48, 0x44, 0x52, // IHDR
        0x00, 0x00, 0x00, 0x01, 0x00, 0x00, 0x00, 0x01,
        0x08, 0x06, 0x00, 0x00, 0x00, 0x1f, 0x15, 0xc4,
      ]);
      const file = new File([validPngBytes], "logo.png", { type: "image/png" });

      const formData = new FormData();
      formData.append("file", file);

      const request = new NextRequest("http://localhost:3000/api/uploads", {
        method: "POST",
        body: formData,
      });

      const response = await POST(request);
      expect(response.status).toBe(200);

      const body = await response.json();
      expect(body.ok).toBe(true);
      expect(body.url).toBeDefined();
    });
  });
});
