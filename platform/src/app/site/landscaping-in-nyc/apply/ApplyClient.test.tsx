import { describe, it, expect, vi, beforeEach } from "vitest";

const uploadToSignedUrlMock = vi.fn();

vi.mock("@supabase/supabase-js", () => ({
  createClient: () => ({
    storage: {
      from: () => ({
        uploadToSignedUrl: uploadToSignedUrlMock,
      }),
    },
  }),
}));

import { uploadFile } from "./ApplyClient";

describe("uploadFile", () => {
  beforeEach(() => {
    uploadToSignedUrlMock.mockReset();
    global.fetch = vi.fn(async () => ({
      ok: true,
      json: async () => ({ path: "p", token: "t", publicUrl: "https://example.com/f.mp4" }),
    })) as unknown as typeof fetch;
  });

  it("throws a friendly message when the storage SDK returns an error object", async () => {
    uploadToSignedUrlMock.mockResolvedValue({ error: { message: "denied" } });
    const file = new File(["x"], "video.mp4", { type: "video/mp4" });

    await expect(uploadFile(file, "video")).rejects.toThrow(
      "Failed to upload video. Please try again."
    );
  });

  it("normalizes a synchronous SDK throw (e.g. DOMException) to the same friendly message instead of leaking raw browser error text", async () => {
    uploadToSignedUrlMock.mockImplementation(() => {
      throw new DOMException("The string did not match the expected pattern.", "SyntaxError");
    });
    const file = new File(["x"], "video.mp4", { type: "video/mp4" });

    await expect(uploadFile(file, "video")).rejects.toThrow(
      "Failed to upload video. Please try again."
    );
    await expect(uploadFile(file, "video")).rejects.not.toThrow(
      /did not match the expected pattern/
    );
  });

  it("returns the public URL on success", async () => {
    uploadToSignedUrlMock.mockResolvedValue({ error: null });
    const file = new File(["x"], "video.mp4", { type: "video/mp4" });

    await expect(uploadFile(file, "video")).resolves.toBe("https://example.com/f.mp4");
  });
});
