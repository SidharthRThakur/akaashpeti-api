"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const authMiddleware_1 = require("../middleware/authMiddleware");
const db_1 = require("../db");
const router = (0, express_1.Router)();
/**
 * ✅ Share item with a user
 * POST /api/share
 * Body: { item_type: "file" | "folder", item_id: string, shared_with: string (email), role: "viewer" | "editor" }
 */
router.post("/", authMiddleware_1.authenticate, async (req, res) => {
    try {
        const user = req.user;
        if (!user?.id)
            return res.status(401).json({ error: "User not authenticated" });
        const { item_type, item_id, shared_with, role } = req.body;
        if (!item_type || !item_id || !shared_with || !role) {
            return res.status(400).json({ error: "Missing required fields" });
        }
        // 🔍 Lookup target user by email
        const { data: targetUser, error: lookupError } = await db_1.supabase
            .from("users") // Replace with your actual user table name
            .select("id")
            .eq("email", shared_with)
            .single();
        if (lookupError || !targetUser) {
            console.error("User lookup error:", lookupError?.message);
            return res.status(404).json({ error: "User not found for provided email" });
        }
        const insertPayload = {
            item_id: String(item_id),
            item_type: String(item_type),
            shared_with: targetUser.id, // ✅ UUID instead of email
            role: String(role),
            owner_id: String(user.id),
        };
        const { data, error } = await db_1.supabase
            .from("shared_items")
            .insert([insertPayload])
            .select()
            .single();
        if (error) {
            console.error("Share insert error:", error);
            return res.status(400).json({ error: error.message });
        }
        return res.status(201).json({ shared: data });
    }
    catch (err) {
        console.error("Server error:", err);
        return res.status(500).json({ error: err.message });
    }
});
/**
 * ✅ List shares
 * GET /api/share?item_id=<uuid>
 */
router.get("/", authMiddleware_1.authenticate, async (req, res) => {
    try {
        const user = req.user;
        if (!user?.id)
            return res.status(401).json({ error: "User not authenticated" });
        const itemId = req.query.item_id || null;
        let query = db_1.supabase
            .from("shared_items")
            .select("*")
            .or(`owner_id.eq.${user.id},shared_with.eq.${user.id}`)
            .order("created_at", { ascending: false });
        if (itemId) {
            query = query.eq("item_id", itemId);
        }
        const { data, error } = await query;
        if (error) {
            console.error("Share fetch error:", error);
            return res.status(400).json({ error: error.message });
        }
        return res.json({ shared: data });
    }
    catch (err) {
        console.error("Server error:", err);
        return res.status(500).json({ error: err.message });
    }
});
/**
 * ✅ Delete a share record
 * DELETE /api/share/:id
 */
router.delete("/:id", authMiddleware_1.authenticate, async (req, res) => {
    try {
        const user = req.user;
        if (!user?.id)
            return res.status(401).json({ error: "User not authenticated" });
        const { id } = req.params;
        if (!id)
            return res.status(400).json({ error: "Missing share id" });
        const { data, error } = await db_1.supabase
            .from("shared_items")
            .delete()
            .eq("id", id)
            .select()
            .single();
        if (error) {
            console.error("Share delete error:", error);
            return res.status(400).json({ error: error.message });
        }
        return res.json({ deleted: data });
    }
    catch (err) {
        console.error("Server error:", err);
        return res.status(500).json({ error: err.message });
    }
});
exports.default = router;
