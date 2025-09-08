// apps/api/routes/folders.ts`
import { Router, Response } from "express";
import { AuthRequests } from "../types/AuthRequests";

import { supabase } from "../db";
import { authenticate, AuthRequest } from "../middleware/authMiddleware";

const router = Router();

/**
 * ✅ Create Folder
 * POST /api/folders
 */
router.post("/", authenticate, async (req: AuthRequest, res) => {
  try {
    const userId = req.user.id;
    const { name, parent_id } = req.body;

    if (!name) return res.status(400).json({ error: "Folder name is required" });

    const { data, error } = await supabase
      .from("folders")
      .insert([{ name, owner_id: userId, parent_id: parent_id || null }])
      .select()
      .single();

    if (error) throw error;

    res.json({ message: "Folder created successfully", folder: data });
  } catch (err: any) {
    console.error("Create Folder Error:", err);
    res.status(500).json({ error: err.message });
  }
});

/**
 * ✅ List All User Folders
 * GET /api/folders
 */
router.get("/", authenticate, async (req: AuthRequest, res) => {
  try {
    const userId = req.user.id;

    const { data, error } = await supabase
      .from("folders")
      .select("*")
      .eq("owner_id", userId)
      .eq("is_deleted", false);

    if (error) throw error;

    res.json({ folders: data });
  } catch (err: any) {
    console.error("List Folders Error:", err);
    res.status(500).json({ error: err.message });
  }
});

/**
 * ✅ Get Root Folder Contents
 * GET /api/folders/root
 */
router.get("/root", authenticate, async (req: AuthRequest, res) => {
  try {
    const userId = req.user.id;

    const { data: folders, error: folderError } = await supabase
      .from("folders")
      .select("*")
      .eq("owner_id", userId)
      .is("parent_id", null)
      .eq("is_deleted", false);

    if (folderError) throw folderError;

    const { data: files, error: fileError } = await supabase
      .from("files")
      .select("*")
      .eq("owner_id", userId)
      .is("folder_id", null)
      .eq("is_deleted", false);

    if (fileError) throw fileError;

    res.json({ folders, files });
  } catch (err: any) {
    console.error("Get Root Folder Contents Error:", err);
    res.status(500).json({ error: err.message });
  }
});

/**
 * ✅ Get Folder Contents
 * GET /api/folders/:id/contents
 */
router.get("/:id/contents", authenticate, async (req: AuthRequest, res) => {
  try {
    const userId = req.user.id;
    const folderId = req.params.id;

    const { data: folder, error: folderError } = await supabase
      .from("folders")
      .select("*")
      .eq("id", folderId)
      .eq("owner_id", userId)
      .eq("is_deleted", false)
      .single();

    if (folderError) throw folderError;
    if (!folder) return res.status(404).json({ error: "Folder not found" });

    const { data: subfolders, error: subfoldersError } = await supabase
      .from("folders")
      .select("*")
      .eq("parent_id", folderId)
      .eq("owner_id", userId)
      .eq("is_deleted", false);

    if (subfoldersError) throw subfoldersError;

    const { data: files, error: filesError } = await supabase
      .from("files")
      .select("*")
      .eq("folder_id", folderId)
      .eq("owner_id", userId)
      .eq("is_deleted", false);

    if (filesError) throw filesError;

    res.json({ folder, subfolders, files });
  } catch (err: any) {
    console.error("Get Folder Contents Error:", err);
    res.status(500).json({ error: err.message });
  }
});

/**
 * ✅ Rename Folder
 * PATCH /api/folders/:id
 */
router.patch("/:id", authenticate, async (req: AuthRequest, res) => {
  try {
    const { newName } = req.body;
    if (!newName) return res.status(400).json({ error: "New name is required" });

    const { data, error } = await supabase
      .from("folders")
      .update({ name: newName })
      .eq("id", req.params.id)
      .eq("owner_id", req.user.id)
      .select()
      .single();

    if (error) throw error;

    res.json({ message: "Folder renamed successfully", folder: data });
  } catch (err: any) {
    console.error("Rename Folder Error:", err);
    res.status(500).json({ error: err.message });
  }
});

/**
 * ✅ Delete Folder (Soft Delete)
 * DELETE /api/folders/:id
 */
router.delete("/:id", authenticate, async (req: AuthRequest, res) => {
  try {
    const { data, error } = await supabase
      .from("folders")
      .update({ is_deleted: true, updated_at: new Date().toISOString() })
      .eq("id", req.params.id)
      .eq("owner_id", req.user.id)
      .select()
      .single();

    if (error) throw error;

    res.json({ message: "Folder moved to trash", folder: data });
  } catch (err: any) {
    console.error("Delete Folder Error:", err);
    res.status(500).json({ error: err.message });
  }
});

export default router;
