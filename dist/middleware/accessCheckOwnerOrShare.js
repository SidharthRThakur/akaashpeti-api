"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.accessCheck = void 0;
const db_1 = require("../db");
/**
 * Checks if req.user is owner of the resource OR has a share entry.
 * itemType: 'file'|'folder'
 * If requireEditor = true it also checks that role === 'editor' or owner.
 */
const accessCheck = (itemType, requireEditor = false) => async (req, res, next) => {
    try {
        const user = req.user;
        const itemId = req.params.id || req.body.item_id;
        if (!user?.id)
            return res.status(401).json({ error: "User not authenticated" });
        if (!itemId)
            return res.status(400).json({ error: "Missing item_id" });
        // 1) Check ownership
        const table = itemType === "file" ? "files" : "folders";
        const ownerQ = await db_1.supabase.from(table).select("id,user_id").eq("id", itemId).maybeSingle();
        if (ownerQ.error) {
            console.error("Owner check error:", ownerQ.error);
            return res.status(500).json({ error: "Server error" });
        }
        if (ownerQ.data && String(ownerQ.data.user_id) === String(user.id)) {
            return next();
        }
        // 2) Check share row
        const { data: share, error: shareErr } = await db_1.supabase
            .from("shared_items")
            .select("id,role,owner_id,shared_with")
            .eq("item_id", itemId)
            .eq("item_type", itemType)
            .or(`owner_id.eq.${user.id},shared_with.eq.${user.id}`)
            .maybeSingle();
        if (shareErr) {
            console.error("Share lookup error:", shareErr);
            return res.status(500).json({ error: "Server error" });
        }
        if (!share)
            return res.status(403).json({ error: "Access denied" });
        if (requireEditor) {
            if (share.role !== "editor" && String(share.owner_id) !== String(user.id)) {
                return res.status(403).json({ error: "Editor role required" });
            }
        }
        next();
    }
    catch (err) {
        console.error("Access middleware error:", err);
        return res.status(500).json({ error: err.message });
    }
};
exports.accessCheck = accessCheck;
