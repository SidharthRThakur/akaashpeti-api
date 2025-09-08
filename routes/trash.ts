// apps/api/routes/trash.ts
import { Router, Response } from "express";
import { AuthRequests } from "../types/AuthRequests";
import { supabase } from "../db";
import { authenticate, AuthRequest } from "../middleware/authMiddleware";

const router = Router();

/**
 * ✅ Get all trashed items (files + folders)
 * GET /api/trash
 */
router.get("/", authenticate, async (req: AuthRequest, res) => {
  try {
    const userId = req.user.id;

    const { data: trashedFiles, error: filesError } = await supabase
      .from("files")
      .select("*")
      .eq("owner_id", userId)
      .eq("is_deleted", true);

    if (filesError) throw filesError;

    const { data: trashedFolders, error: foldersError } = await supabase
      .from("folders")
      .select("*")
      .eq("owner_id", userId)
      .eq("is_deleted", true);

    if (foldersError) throw foldersError;

    res.json({ files: trashedFiles, folders: trashedFolders });
  } catch (err: any) {
    console.error("List Trash Error:", err);
    res.status(500).json({ error: err.message });
  }
});

/**
 * ✅ Restore File/Folder from Trash
 * PATCH /api/trash/restore/:id
 */
router.patch("/restore/:id", authenticate, async (req: AuthRequest, res) => {
  try {
    const { id } = req.params;
    const { type } = req.body; // "file" | "folder"

    if (!type) return res.status(400).json({ error: "type is required" });

    let query = supabase.from(type === "file" ? "files" : "folders");

    const { data, error } = await query
      .update({ is_deleted: false, updated_at: new Date().toISOString() })
      .eq("id", id)
      .eq("owner_id", req.user.id)
      .select()
      .single();

    if (error) throw error;

    res.json({ message: `${type} restored successfully`, restored: data });
  } catch (err: any) {
    console.error("Restore Error:", err);
    res.status(500).json({ error: err.message });
  }
});

/**
 * ✅ Permanently delete item (file or folder)
 * DELETE /api/trash/:type/:id
 */
router.delete("/:type/:id", authenticate, async (req: AuthRequest, res) => {
  try {
    const { type, id } = req.params;

    if (type === "file") {
      const { error } = await supabase
        .from("files")
        .delete()
        .eq("id", id)
        .eq("owner_id", req.user.id);

      if (error) throw error;
      return res.json({ message: "File permanently deleted" });
    }

    if (type === "folder") {
      const { error } = await supabase
        .from("folders")
        .delete()
        .eq("id", id)
        .eq("owner_id", req.user.id);

      if (error) throw error;
      return res.json({ message: "Folder permanently deleted" });
    }

    return res.status(400).json({ error: "Invalid type. Must be 'file' or 'folder'." });
  } catch (err: any) {
    console.error("Permanent Delete Trash Error:", err);
    res.status(500).json({ error: err.message });
  }
});

export default router;
