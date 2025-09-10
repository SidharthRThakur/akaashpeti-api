import { Router, Response } from "express";
import { supabase } from "../db";
import { authenticate } from "../middleware/authMiddleware";
import { AuthRequests } from "../types/AuthRequests";

const router = Router();

// Share a file or folder
router.post("/", authenticate, async (req: AuthRequests, res: Response) => {
  try {
    const { file_id, email, access_level } = req.body;
    const ownerId = req.user?.id;

    // Lookup user by email
    const { data: user, error: userError } = await supabase
      .from("users")
      .select("id")
      .eq("email", email)
      .single();

    if (userError || !user) return res.status(404).json({ error: "User not found" });

    const { data: sharedItem, error: shareError } = await supabase
      .from("shared_items") // Correct table name
      .insert([
        {
          item_id: file_id,       // Correct column
          item_type: "file",      // Assuming you're sharing files (could be dynamic)
          owner_id: ownerId,
          shared_with: user.id,
          role: access_level,     // Correct column
          created_at: new Date().toISOString(),
        },
      ])
      .select()
      .single();

    if (shareError) throw shareError;

    res.json({ message: "Item shared", sharedItem });
  } catch (err: any) {
    console.error("[share.ts][POST] error:", err);
    res.status(500).json({ error: err?.message || "Share failed" });
  }
});

// Get shared items
router.get("/", authenticate, async (req: AuthRequests, res: Response) => {
  try {
    const userId = req.user?.id;

    const { data, error } = await supabase
      .from("shared_items") // Correct table name
      .select("*")
      .eq("shared_with", userId);

    if (error) throw error;

    res.json({ sharedItems: data });
  } catch (err: any) {
    console.error("[share.ts][GET] error:", err);
    res.status(500).json({ error: err?.message || "Failed to fetch shared items" });
  }
});

export default router;
