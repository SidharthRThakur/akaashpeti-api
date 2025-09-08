import { Router, Response } from "express";
import { supabase } from "../db";
import { authenticate } from "../middleware/authMiddleware";
import { AuthRequests } from "../types/AuthRequests";

const router = Router();

// ----------------------
// Create folder
// ----------------------
router.post("/", authenticate, async (req: AuthRequests, res: Response) => {
  try {
    const { name, parent_id } = req.body;
    const userId = req.user?.id;

    if (!userId) return res.status(401).json({ error: "Unauthorized" });

    const { data, error } = await supabase
      .from("folders")
      .insert([
        {
          name,
          parent_id: parent_id || null,
          owner_id: userId,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
      ])
      .select()
      .single();

    if (error) throw error;

    res.json({ message: "Folder created", folder: data });
  } catch (err: any) {
    console.error("[folders.ts] error creating folder:", err);
    res.status(500).json({ error: err?.message || "Failed to create folder" });
  }
});

// ----------------------
// List folders
// ----------------------
router.get("/", authenticate, async (req: AuthRequests, res: Response) => {
  try {
    const userId = req.user?.id;

    const { data, error } = await supabase
      .from("folders")
      .select("*")
      .eq("owner_id", userId)
      .order("created_at", { ascending: false });

    if (error) throw error;

    res.json({ folders: data });
  } catch (err: any) {
    console.error("[folders.ts] error listing folders:", err);
    res.status(500).json({ error: err?.message || "Failed to list folders" });
  }
});

export default router;
