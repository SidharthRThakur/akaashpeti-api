"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
// apps/api/routes/folders.ts`
const express_1 = require("express");
const db_1 = require("../db");
const authMiddleware_1 = require("../middleware/authMiddleware");
const router = (0, express_1.Router)();
/**
 * ✅ Create Folder
 * POST /api/folders
 */
router.post("/", authMiddleware_1.authenticate, async (req, res) => {
    try {
        const userId = req.user.id;
        const { name, parent_id } = req.body;
        if (!name)
            return res.status(400).json({ error: "Folder name is required" });
        const { data, error } = await db_1.supabase
            .from("folders")
            .insert([{ name, owner_id: userId, parent_id: parent_id || null }])
            .select()
            .single();
        if (error)
            throw error;
        res.json({ message: "Folder created successfully", folder: data });
    }
    catch (err) {
        console.error("Create Folder Error:", err);
        res.status(500).json({ error: err.message });
    }
});
/**
 * ✅ List All User Folders
 * GET /api/folders
 */
router.get("/", authMiddleware_1.authenticate, async (req, res) => {
    try {
        const userId = req.user.id;
        const { data, error } = await db_1.supabase
            .from("folders")
            .select("*")
            .eq("owner_id", userId)
            .eq("is_deleted", false);
        if (error)
            throw error;
        res.json({ folders: data });
    }
    catch (err) {
        console.error("List Folders Error:", err);
        res.status(500).json({ error: err.message });
    }
});
/**
 * ✅ Get Root Folder Contents
 * GET /api/folders/root
 */
router.get("/root", authMiddleware_1.authenticate, async (req, res) => {
    try {
        const userId = req.user.id;
        const { data: folders, error: folderError } = await db_1.supabase
            .from("folders")
            .select("*")
            .eq("owner_id", userId)
            .is("parent_id", null)
            .eq("is_deleted", false);
        if (folderError)
            throw folderError;
        const { data: files, error: fileError } = await db_1.supabase
            .from("files")
            .select("*")
            .eq("owner_id", userId)
            .is("folder_id", null)
            .eq("is_deleted", false);
        if (fileError)
            throw fileError;
        res.json({ folders, files });
    }
    catch (err) {
        console.error("Get Root Folder Contents Error:", err);
        res.status(500).json({ error: err.message });
    }
});
/**
 * ✅ Get Folder Contents
 * GET /api/folders/:id/contents
 */
router.get("/:id/contents", authMiddleware_1.authenticate, async (req, res) => {
    try {
        const userId = req.user.id;
        const folderId = req.params.id;
        const { data: folder, error: folderError } = await db_1.supabase
            .from("folders")
            .select("*")
            .eq("id", folderId)
            .eq("owner_id", userId)
            .eq("is_deleted", false)
            .single();
        if (folderError)
            throw folderError;
        if (!folder)
            return res.status(404).json({ error: "Folder not found" });
        const { data: subfolders, error: subfoldersError } = await db_1.supabase
            .from("folders")
            .select("*")
            .eq("parent_id", folderId)
            .eq("owner_id", userId)
            .eq("is_deleted", false);
        if (subfoldersError)
            throw subfoldersError;
        const { data: files, error: filesError } = await db_1.supabase
            .from("files")
            .select("*")
            .eq("folder_id", folderId)
            .eq("owner_id", userId)
            .eq("is_deleted", false);
        if (filesError)
            throw filesError;
        res.json({ folder, subfolders, files });
    }
    catch (err) {
        console.error("Get Folder Contents Error:", err);
        res.status(500).json({ error: err.message });
    }
});
/**
 * ✅ Rename Folder
 * PATCH /api/folders/:id
 */
router.patch("/:id", authMiddleware_1.authenticate, async (req, res) => {
    try {
        const { newName } = req.body;
        if (!newName)
            return res.status(400).json({ error: "New name is required" });
        const { data, error } = await db_1.supabase
            .from("folders")
            .update({ name: newName })
            .eq("id", req.params.id)
            .eq("owner_id", req.user.id)
            .select()
            .single();
        if (error)
            throw error;
        res.json({ message: "Folder renamed successfully", folder: data });
    }
    catch (err) {
        console.error("Rename Folder Error:", err);
        res.status(500).json({ error: err.message });
    }
});
/**
 * ✅ Delete Folder (Soft Delete)
 * DELETE /api/folders/:id
 */
router.delete("/:id", authMiddleware_1.authenticate, async (req, res) => {
    try {
        const { data, error } = await db_1.supabase
            .from("folders")
            .update({ is_deleted: true, updated_at: new Date().toISOString() })
            .eq("id", req.params.id)
            .eq("owner_id", req.user.id)
            .select()
            .single();
        if (error)
            throw error;
        res.json({ message: "Folder moved to trash", folder: data });
    }
    catch (err) {
        console.error("Delete Folder Error:", err);
        res.status(500).json({ error: err.message });
    }
});
exports.default = router;
