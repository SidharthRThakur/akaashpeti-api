// apps/api/routes/share.ts
import { Router, Response } from "express";
import { supabase } from "../db";
import { authenticate } from "../middleware/authMiddleware";
import { AuthRequests } from "../types/AuthRequests";

const router = Router();
console.log("[share.ts] Share routes loaded");

// ----------------------
// Share a file or folder
// ----------------------
router.post("/", authenticate, async (req: AuthRequests, res: Response) => {
  try {
    const { item_id, item_type, email, access_level } = req.body;
    const ownerId = req.user?.id;

    if (!item_id || !item_type || !email || !access_level) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    // find recipient
    const { data: user, error: userError } = await supabase
      .from("users")
      .select("id")
      .eq("email", email)
      .single();

    if (userError || !user) {
      return res.status(404).json({ error: "Recipient user not found" });
    }

    // insert
    const { data: sharedItem, error: shareError } = await supabase
      .from("shared_items")
      .insert([
        {
          item_id,
          item_type, // ✅ dynamic now
          owner_id: ownerId,
          shared_with: user.id,
          role: access_level,
          created_at: new Date().toISOString(),
        },
      ])
      .select()
      .single();

    if (shareError) {
      console.error("[share.ts][POST] Share failed:", shareError);
      return res.status(500).json({ error: "Failed to share item" });
    }

    res.json({ message: "Item shared successfully", sharedItem });
  } catch (error: unknown) {
    console.error("[share.ts][POST] Unexpected error:", (error as Error)?.message);
    res.status(500).json({ error: "Unexpected error occurred" });
  }
});

// ----------------------
// Helper: fetch item name from files or folders
// ----------------------
async function resolveItemName(item_id: string, item_type: string): Promise<string> {
  if (item_type === "file") {
    const { data: file } = await supabase.from("files").select("name").eq("id", item_id).single();
    return file?.name || "Unnamed file";
  } else if (item_type === "folder") {
    const { data: folder } = await supabase.from("folders").select("name").eq("id", item_id).single();
    return folder?.name || "Unnamed folder";
  }
  return "Unknown item";
}

// ----------------------
// Get items shared with me
// ----------------------
router.get("/shared-with-me", authenticate, async (req: AuthRequests, res: Response) => {
  try {
    const userId = req.user?.id;

    const { data: sharedItems, error } = await supabase
      .from("shared_items")
      .select("*")
      .eq("shared_with", userId);

    if (error) throw error;

    const results = [];
    for (const item of sharedItems || []) {
      const itemName = await resolveItemName(item.item_id, item.item_type);
      results.push({ ...item, item_name: itemName });
    }

    res.json({ sharedWithMe: results });
  } catch (error: unknown) {
    console.error("[share.ts][GET /shared-with-me] error:", (error as Error)?.message);
    res.status(500).json({ error: "Failed to fetch shared items" });
  }
});

// ----------------------
// Get items I have shared
// ----------------------
router.get("/shared-by-me", authenticate, async (req: AuthRequests, res: Response) => {
  try {
    const userId = req.user?.id;

    const { data: sharedItems, error } = await supabase
      .from("shared_items")
      .select("*")
      .eq("owner_id", userId);

    if (error) throw error;

    const results = [];
    for (const item of sharedItems || []) {
      const itemName = await resolveItemName(item.item_id, item.item_type);
      results.push({ ...item, item_name: itemName });
    }

    res.json({ sharedByMe: results });
  } catch (error: unknown) {
    console.error("[share.ts][GET /shared-by-me] error:", (error as Error)?.message);
    res.status(500).json({ error: "Failed to fetch shared items by me" });
  }
});

export default router;
