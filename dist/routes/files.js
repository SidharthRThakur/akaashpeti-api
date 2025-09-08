"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
// apps/api/routes/files.ts
// Updated — ensures storage_path is always set, correct backend labels, improved logging
const express_1 = require("express");
const multer_1 = __importDefault(require("multer"));
const path_1 = __importDefault(require("path"));
const fs_1 = __importDefault(require("fs"));
const db_1 = require("../db");
const authMiddleware_1 = require("../middleware/authMiddleware");
const router = (0, express_1.Router)();
const upload = (0, multer_1.default)({ storage: multer_1.default.memoryStorage() });
/**
 * Helper: ensure uploads dir exists (for local fallback)
 */
const ensureUploadsDir = () => {
    const uploadsDir = path_1.default.join(process.cwd(), "uploads");
    if (!fs_1.default.existsSync(uploadsDir))
        fs_1.default.mkdirSync(uploadsDir, { recursive: true });
    return uploadsDir;
};
/**
 * POST /api/files
 * - Uploads to Supabase storage first
 * - If Supabase fails, falls back to local storage
 * - Always inserts metadata into files table
 */
router.post("/", authMiddleware_1.authenticate, upload.single("file"), async (req, res) => {
    try {
        if (!req.file)
            return res.status(400).json({ error: "No file uploaded" });
        const userId = req.user.id;
        const folderId = req.body.folder_id || null;
        const originalName = req.file.originalname;
        const mimeType = req.file.mimetype;
        const sizeBytes = req.file.size;
        // Build storage key/path
        const storageKey = `${userId}/${Date.now()}_${originalName}`;
        // --------------------
        // Try Supabase storage
        // --------------------
        try {
            const { error: uploadError } = await db_1.supabase.storage
                .from("akaashpeti")
                .upload(storageKey, req.file.buffer, {
                contentType: mimeType,
                upsert: false,
            });
            if (uploadError)
                throw uploadError;
            // Save metadata in DB
            const { data: fileRecord, error: dbError } = await db_1.supabase
                .from("files")
                .insert([
                {
                    name: originalName,
                    mime_type: mimeType,
                    size_bytes: sizeBytes,
                    storage_key: storageKey,
                    storage_path: storageKey, // ✅ FIXED: required by DB
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
            if (dbError) {
                console.error("[files.ts] Supabase DB insert error after upload:", dbError);
                return res.status(500).json({ error: "Failed to save file metadata (DB error)" });
            }
            return res.json({ message: "Uploaded to Supabase storage", file: fileRecord });
        }
        catch (supErr) {
            // --------------------
            // Local fallback
            // --------------------
            console.error("[files.ts] Supabase upload failed, falling back to local storage:", supErr);
            try {
                const uploadsDir = ensureUploadsDir();
                const localFilename = `${Date.now()}_${originalName}`;
                const fullPath = path_1.default.join(uploadsDir, localFilename);
                fs_1.default.writeFileSync(fullPath, req.file.buffer);
                const { data: fallbackRecord, error: fallbackDbErr } = await db_1.supabase
                    .from("files")
                    .insert([
                    {
                        name: originalName,
                        mime_type: mimeType,
                        size_bytes: sizeBytes,
                        storage_key: localFilename,
                        storage_path: fullPath, // ✅ FIXED: required by DB
                        storage_backend: "local", // ✅ FIXED: correct backend label
                        owner_id: userId,
                        folder_id: null,
                        is_deleted: false,
                        created_at: new Date().toISOString(),
                        updated_at: new Date().toISOString(),
                    },
                ])
                    .select()
                    .single();
                if (fallbackDbErr) {
                    console.error("[files.ts] DB insert failed for local fallback:", fallbackDbErr);
                    return res.status(200).json({
                        message: "File saved locally, but failed to save metadata to DB",
                        local: { path: fullPath, name: originalName },
                    });
                }
                return res.json({
                    message: "Uploaded saved locally (Supabase failed)",
                    file: fallbackRecord,
                });
            }
            catch (localErr) {
                console.error("[files.ts] Local fallback write failed:", localErr);
                return res.status(500).json({ error: "File upload failed (Supabase + local fallback failed)" });
            }
        }
    }
    catch (err) {
        console.error("[files.ts] Unexpected error in upload route:", err);
        return res.status(500).json({ error: err?.message || String(err) });
    }
});
/**
 * GET /api/files
 */
router.get("/", authMiddleware_1.authenticate, async (req, res) => {
    try {
        const userId = req.user.id;
        const { data: files, error } = await db_1.supabase
            .from("files")
            .select("*")
            .eq("owner_id", userId)
            .eq("is_deleted", false)
            .order("created_at", { ascending: false });
        if (error) {
            console.error("[files.ts] Error listing files:", error);
            return res.status(500).json({ error: "Failed to list files" });
        }
        return res.json({ files });
    }
    catch (err) {
        console.error("[files.ts] Unexpected error listing files:", err);
        return res.status(500).json({ error: err?.message || String(err) });
    }
});
/**
 * DELETE /api/files/:id  -> soft delete (move to trash)
 */
router.delete("/:id", authMiddleware_1.authenticate, async (req, res) => {
    try {
        const userId = req.user.id;
        const fileId = req.params.id;
        const { data, error } = await db_1.supabase
            .from("files")
            .update({ is_deleted: true, updated_at: new Date().toISOString() })
            .eq("id", fileId)
            .eq("owner_id", userId)
            .select()
            .single();
        if (error) {
            console.error("[files.ts] Error moving file to trash:", error);
            return res.status(500).json({ error: "Failed to move file to trash" });
        }
        return res.json({ message: "File moved to trash", file: data });
    }
    catch (err) {
        console.error("[files.ts] Unexpected delete error:", err);
        return res.status(500).json({ error: err?.message || String(err) });
    }
});
/**
 * PATCH /api/files/restore/:id
 */
router.patch("/restore/:id", authMiddleware_1.authenticate, async (req, res) => {
    try {
        const userId = req.user.id;
        const fileId = req.params.id;
        const { data, error } = await db_1.supabase
            .from("files")
            .update({ is_deleted: false, updated_at: new Date().toISOString() })
            .eq("id", fileId)
            .eq("owner_id", userId)
            .select()
            .single();
        if (error) {
            console.error("[files.ts] Error restoring file:", error);
            return res.status(500).json({ error: "Failed to restore file" });
        }
        return res.json({ message: "File restored", file: data });
    }
    catch (err) {
        console.error("[files.ts] Unexpected restore error:", err);
        return res.status(500).json({ error: err?.message || String(err) });
    }
});
/**
 * GET /api/files/:id/download
 */
router.get("/:id/download", authMiddleware_1.authenticate, async (req, res) => {
    try {
        const userId = req.user.id;
        const fileId = req.params.id;
        const { data: file, error } = await db_1.supabase
            .from("files")
            .select("*")
            .eq("id", fileId)
            .eq("owner_id", userId)
            .maybeSingle();
        if (error) {
            console.error("[files.ts] Error fetching file for download:", error);
            return res.status(500).json({ error: "Failed to fetch file" });
        }
        if (!file)
            return res.status(404).json({ error: "File not found" });
        if (file.storage_backend === "supabase" && file.storage_key) {
            const { data: signedUrlData, error: urlError } = await db_1.supabase.storage
                .from("akaashpeti")
                .createSignedUrl(file.storage_key, 60 * 5);
            if (urlError) {
                console.error("[files.ts] Supabase signed URL error:", urlError);
                return res.status(500).json({ error: "Failed to create signed URL" });
            }
            return res.json({ url: signedUrlData.signedUrl });
        }
        if (file.storage_backend === "local" && typeof file.storage_key === "string") {
            return res.json({ url: `/uploads/${file.storage_key}` });
        }
        return res.status(500).json({ error: "Unknown storage backend for file" });
    }
    catch (err) {
        console.error("[files.ts] Unexpected download error:", err);
        return res.status(500).json({ error: err?.message || String(err) });
    }
});
exports.default = router;
