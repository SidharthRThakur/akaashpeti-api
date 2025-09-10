"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const db_1 = require("../db");
const authMiddleware_1 = require("../middleware/authMiddleware");
const router = (0, express_1.Router)();
// Share a file
router.post("/", authMiddleware_1.authenticate, async (req, res) => {
    try {
        const { file_id, email, access_level } = req.body;
        const ownerId = req.user?.id;
        // Lookup user by email
        const { data: user, error: userError } = await db_1.supabase
            .from("users")
            .select("id")
            .eq("email", email)
            .single();
        if (userError || !user)
            return res.status(404).json({ error: "User not found" });
        const { data: share, error: shareError } = await db_1.supabase
            .from("shares")
            .insert([
            {
                file_id,
                shared_with: user.id,
                access_level,
                owner_id: ownerId,
                created_at: new Date().toISOString(),
            },
        ])
            .select()
            .single();
        if (shareError)
            throw shareError;
        res.json({ message: "File shared", share });
    }
    catch (err) {
        console.error("[share.ts][POST] error:", err);
        res.status(500).json({ error: err?.message || "Share failed" });
    }
});
// Get shared files
router.get("/", authMiddleware_1.authenticate, async (req, res) => {
    try {
        const userId = req.user?.id;
        const { data, error } = await db_1.supabase
            .from("shares")
            .select("*")
            .eq("shared_with", userId);
        if (error)
            throw error;
        res.json({ sharedItems: data });
    }
    catch (err) {
        console.error("[share.ts][GET] error:", err);
        res.status(500).json({ error: err?.message || "Failed to fetch shared files" });
    }
});
exports.default = router;
