"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const db_1 = require("../db");
const authMiddleware_1 = require("../middleware/authMiddleware");
const router = (0, express_1.Router)();
/**
 * Search API
 * GET /api/search?q=term
 */
router.get("/", authMiddleware_1.authenticate, async (req, res) => {
    try {
        const user = req.user;
        const query = req.query.q;
        if (!query) {
            return res.status(400).json({ error: "Search query required" });
        }
        // 🔍 Search in folders
        const { data: folders, error: folderError } = await db_1.supabase
            .from("folders")
            .select("*")
            .ilike("name", `%${query}%`)
            .eq("owner_id", user.id);
        if (folderError)
            throw folderError;
        // 🔍 Search in files
        const { data: files, error: fileError } = await db_1.supabase
            .from("files")
            .select("*")
            .ilike("name", `%${query}%`)
            .eq("owner_id", user.id);
        if (fileError)
            throw fileError;
        return res.json({ folders, files });
    }
    catch (err) {
        console.error("❌ [Search] Error:", err.message);
        return res.status(500).json({ error: err.message });
    }
});
exports.default = router;
