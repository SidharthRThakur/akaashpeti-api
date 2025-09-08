"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
// apps/api/routes/users.ts
const express_1 = require("express");
const db_1 = require("../db");
const authMiddleware_1 = require("../middleware/authMiddleware");
const router = (0, express_1.Router)();
/**
 * ✅ Get All Users
 * GET /api/users
 */
router.get("/", authMiddleware_1.authenticate, async (req, res) => {
    try {
        // sirf zaroori fields fetch karte hain (password ya sensitive data nahi)
        const { data, error } = await db_1.supabase
            .from("users")
            .select("id, email, name, image_url, created_at")
            .order("created_at", { ascending: true });
        if (error)
            throw error;
        res.json({ users: data });
    }
    catch (err) {
        console.error("List Users Error:", err);
        res.status(500).json({ error: err.message });
    }
});
exports.default = router;
