"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const db_1 = require("../db");
const authMiddleware_1 = require("../middleware/authMiddleware");
const router = (0, express_1.Router)();
// ----------------------
// List trash
// ----------------------
router.get("/", authMiddleware_1.authenticate, async (req, res) => {
    try {
        const userId = req.user?.id;
        const { data, error } = await db_1.supabase
            .from("files")
            .select("*")
            .eq("owner_id", userId)
            .eq("is_deleted", true)
            .order("updated_at", { ascending: false });
        if (error)
            throw error;
        res.json({ trash: data });
    }
    catch (err) {
        console.error("[trash.ts] error listing trash:", err);
        res.status(500).json({ error: err?.message || "Failed to fetch trash" });
    }
});
// ----------------------
// Permanently delete file
// ----------------------
router.delete("/:id", authMiddleware_1.authenticate, async (req, res) => {
    try {
        const userId = req.user?.id;
        const fileId = req.params.id;
        const { error } = await db_1.supabase
            .from("files")
            .delete()
            .eq("id", fileId)
            .eq("owner_id", userId);
        if (error)
            throw error;
        res.json({ message: "File permanently deleted" });
    }
    catch (err) {
        console.error("[trash.ts] error deleting file:", err);
        res.status(500).json({ error: err?.message || "Failed to delete file" });
    }
});
exports.default = router;
