import { Router, Response } from "express";
import { supabase } from "../db";
import { authenticate } from "../middleware/authMiddleware";
import { AuthRequests } from "../types/AuthRequests";

const router = Router();
console.log("[share.ts] Share routes loaded");

// POST /api/share
router.post("/", authenticate, async (req: AuthRequests, res: Response) => {
  try {
    const { file_id, email, access_level } = req.body;
    const ownerId = req.user?.id;

    if (!file_id || !email || !access_level) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    const { data: user, error: userError } = await supabase
      .from("users")
      .select("id")
      .eq("email", email)
      .single();

    if (userError || !user) {
      return res.status(404).json({ error: "Recipient user not found" });
    }

    const { data: sharedItem, error: shareError } = await supabase
      .from("shared_items")
      .insert([
        {
          item_id: file_id,
          item_type: "file",
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
  } catch (err: any) {
    console.error("[share.ts][POST] Unexpected error:", err);
    res.status(500).json({ error: err?.message || "Unexpected error occurred" });
  }
});

// GET /api/share/shared
router.get("/shared", authenticate, async (req: AuthRequests, res: Response) => {
  try {
    const userId = req.user?.id;

    const { data: sharedItems, error: sharedError } = await supabase
      .from("shared_items")
      .select("*")
      .eq("shared_with", userId);

    if (sharedError) throw sharedError;

    const detailedSharedItems = await Promise.all(
      sharedItems.map(async (item: any) => {
        let name = "Unknown";
        if (item.item_type === "file") {
          const { data: fileData, error: fileError } = await supabase
            .from("files")
            .select("name")
            .eq("id", item.item_id)
            .single();
          if (!fileError && fileData) {
            name = fileData.name;
          }
        } else if (item.item_type === "folder") {
          const { data: folderData, error: folderError } = await supabase
            .from("folders")
            .select("name")
            .eq("id", item.item_id)
            .single();
          if (!folderError && folderData) {
            name = folderData.name;
          }
        }

        return {
          id: item.id,
          item_id: item.item_id,
          item_type: item.item_type,
          owner_id: item.owner_id,
          shared_with: item.shared_with,
          role: item.role,
          created_at: item.created_at,
          name, // Add the file/folder name
        };
      })
    );

    res.json({ sharedItems: detailedSharedItems });
  } catch (err: any) {
    console.error("[share.ts][GET /shared] error:", err);
    res.status(500).json({ error: err?.message || "Failed to fetch shared items" });
  }
});


export default router;
