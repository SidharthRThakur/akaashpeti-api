"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const db_1 = require("../db");
const authMiddleware_1 = require("../middleware/authMiddleware");
const router = (0, express_1.Router)();
// ----------------------
// Create folder
// ----------------------
router.post("/", authMiddleware_1.authenticate, async (req, res) => {
    try {
        const { name, parent_id } = req.body;
        const userId = req.user?.id;
        if (!userId)
            return res.status(401).json({ error: "Unauthorized" });
        const { data, error } = await db_1.supabase
            .from("folders")
            .insert([
            {
                name,
                parent_id: parent_id || null,
                owner_id: userId,
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString(),
            },
        ])
            .select()
            .single();
        if (error)
            throw error;
        res.json({ message: "Folder created", folder: data });
    }
    catch (err) {
        console.error("[folders.ts] error creating folder:", err);
        res.status(500).json({ error: err?.message || "Failed to create folder" });
    }
});
// ----------------------
// List folders
// ----------------------
router.get("/", authMiddleware_1.authenticate, async (req, res) => {
    try {
        const userId = req.user?.id;
        const { data, error } = await db_1.supabase
            .from("folders")
            .select("*")
            .eq("owner_id", userId)
            .order("created_at", { ascending: false });
        if (error)
            throw error;
        res.json({ folders: data });
    }
    catch (err) {
        console.error("[folders.ts] error listing folders:", err);
        res.status(500).json({ error: err?.message || "Failed to list folders" });
    }
});
exports.default = router;
