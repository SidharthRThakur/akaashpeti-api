import { Router, Response } from "express";
import multer from "multer";
import path from "path";
import fs from "fs";
import { supabase } from "../db";
import { authenticate } from "../middleware/authMiddleware";
import { AuthRequests } from "../types/AuthRequests";

const router = Router();
const upload = multer({ storage: multer.memoryStorage() });

// ensure uploads dir for local fallback
const ensureUploadsDir = () => {
  const uploadsDir = path.join(process.cwd(), "uploads");
  if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });
  return uploadsDir;
};

// ----------------------
// Upload
// ----------------------
router.post("/", authenticate, upload.single("file"), async (req: AuthRequests, res: Response) => {
  try {
    if (!req.file) return res.status(400).json({ error: "No file uploaded" });

    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ error: "Unauthorized" });

    const folderId = req.body.folder_id || null;
    const { originalname, mimetype, size, buffer } = req.file;
    const storageKey = `${userId}/${Date.now()}_${originalname}`;

    // Try Supabase
    try {
      const { error: uploadError } = await supabase.storage
        .from("akaashpeti")
        .upload(storageKey, buffer, { contentType: mimetype });

      if (uploadError) throw uploadError;

      const { data: fileRecord, error: dbError } = await supabase
        .from("files")
        .insert([
          {
            name: originalname,
            mime_type: mimetype,
            size_bytes: size,
            storage_key: storageKey,
            storage_path: storageKey,   // ✅ always set
            storage_backend: "supabase",
            owner_id: userId,
            folder_id: folderId,
            is_deleted: false,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          },
        ])
        .select()
        .single();

      if (dbError) throw dbError;

      return res.json({ message: "Uploaded to Supabase storage", file: fileRecord });
    } catch (supErr) {
      console.error("[files.ts] Supabase upload failed:", supErr);

      // Local fallback
      const uploadsDir = ensureUploadsDir();
      const localFilename = `${Date.now()}_${originalname}`;
      const fullPath = path.join(uploadsDir, localFilename);
      fs.writeFileSync(fullPath, buffer);

      const { data: fallbackRecord } = await supabase
        .from("files")
        .insert([
          {
            name: originalname,
            mime_type: mimetype,
            size_bytes: size,
            storage_key: localFilename,
            storage_path: fullPath,   // ✅ required
            storage_backend: "local", // ✅ fixed
            owner_id: userId,
            folder_id: null,
            is_deleted: false,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          },
        ])
        .select()
        .single();

      return res.json({ message: "File saved locally", file: fallbackRecord });
    }
  } catch (err: any) {
    console.error("[files.ts] Unexpected upload error:", err);
    return res.status(500).json({ error: err?.message || "Upload failed" });
  }
});

// ----------------------
// List files
// ----------------------
router.get("/", authenticate, async (req: AuthRequests, res: Response) => {
  const userId = req.user?.id;
  const { data, error } = await supabase
    .from("files")
    .select("*")
    .eq("owner_id", userId)
    .eq("is_deleted", false)
    .order("created_at", { ascending: false });

  if (error) return res.status(500).json({ error: "Failed to list files" });
  res.json({ files: data });
});

// ----------------------
// Trash (soft delete)
// ----------------------
router.delete("/:id", authenticate, async (req: AuthRequests, res: Response) => {
  const userId = req.user?.id;
  const fileId = req.params.id;

  const { data, error } = await supabase
    .from("files")
    .update({ is_deleted: true, updated_at: new Date().toISOString() })
    .eq("id", fileId)
    .eq("owner_id", userId)
    .select()
    .single();

  if (error) return res.status(500).json({ error: "Failed to move file to trash" });
  res.json({ message: "File moved to trash", file: data });
});

// ----------------------
// Restore
// ----------------------
router.patch("/restore/:id", authenticate, async (req: AuthRequests, res: Response) => {
  const userId = req.user?.id;
  const fileId = req.params.id;

  const { data, error } = await supabase
    .from("files")
    .update({ is_deleted: false, updated_at: new Date().toISOString() })
    .eq("id", fileId)
    .eq("owner_id", userId)
    .select()
    .single();

  if (error) return res.status(500).json({ error: "Failed to restore file" });
  res.json({ message: "File restored", file: data });
});

// ----------------------
// Download
// ----------------------
router.get("/:id/download", authenticate, async (req: AuthRequests, res: Response) => {
  const userId = req.user?.id;
  const fileId = req.params.id;

  const { data: file, error } = await supabase
    .from("files")
    .select("*")
    .eq("id", fileId)
    .eq("owner_id", userId)
    .maybeSingle();

  if (error || !file) return res.status(404).json({ error: "File not found" });

  if (file.storage_backend === "supabase" && file.storage_key) {
    const { data: signed, error: urlError } = await supabase.storage
      .from("akaashpeti")
      .createSignedUrl(file.storage_key, 60 * 5);

    if (urlError) return res.status(500).json({ error: "Failed to create signed URL" });
    return res.json({ url: signed.signedUrl });
  }

  if (file.storage_backend === "local") {
    return res.json({ url: `/uploads/${file.storage_key}` });
  }

  res.status(500).json({ error: "Unknown storage backend" });
});

export default router;
