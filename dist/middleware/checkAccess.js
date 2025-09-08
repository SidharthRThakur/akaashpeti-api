"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.checkAccess = void 0;
const db_1 = require("../db");
/**
 * Middleware to check if user has access to an item (file or folder).
 * Usage: router.get("/:id", authenticate, checkAccess("file"), handler)
 */
const checkAccess = (itemType) => async (req, res, next) => {
    try {
        const user = req.user;
        const itemId = req.params.id || req.body.item_id;
        if (!user?.id) {
            return res.status(401).json({ error: "User not authenticated" });
        }
        if (!itemId) {
            return res.status(400).json({ error: "Missing item_id" });
        }
        // 🔍 Check ownership or sharing
        const { data, error } = await db_1.supabase
            .from("shared_items")
            .select("id")
            .or(`owner_id.eq.${user.id},shared_with.eq.${user.id}`)
            .eq("item_id", itemId)
            .eq("item_type", itemType)
            .maybeSingle();
        if (error) {
            console.error("Access check error:", error);
            return res.status(500).json({ error: "Error checking access" });
        }
        if (!data) {
            return res.status(403).json({ error: "Access denied" });
        }
        // ✅ Access granted
        next();
    }
    catch (err) {
        console.error("Access middleware error:", err);
        return res.status(500).json({ error: err.message });
    }
};
exports.checkAccess = checkAccess;
