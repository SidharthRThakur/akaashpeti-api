import { Router, Response } from "express";
import { supabase } from "../db";
import { authenticate } from "../middleware/authMiddleware";
import { AuthRequests } from "../types/AuthRequests";

const router = Router();

// ----------------------
// List trash
// ----------------------
router.get("/", authenticate, async (req: AuthRequests, res: Response) => {
  try {
    const userId = req.user?.id;

    const { data, error } = await supabase
      .from("files")
      .select("*")
      .eq("owner_id", userId)
      .eq("is_deleted", true)
      .order("updated_at", { ascending: false });

    if (error) throw error;

    res.json({ trash: data });
  } catch (err: any) {
    console.error("[trash.ts] error listing trash:", err);
    res.status(500).json({ error: err?.message || "Failed to fetch trash" });
  }
});

// ----------------------
// Permanently delete file
// ----------------------
router.delete("/:id", authenticate, async (req: AuthRequests, res: Response) => {
  try {
    const userId = req.user?.id;
    const fileId = req.params.id;

    const { error } = await supabase
      .from("files")
      .delete()
      .eq("id", fileId)
      .eq("owner_id", userId);

    if (error) throw error;

    res.json({ message: "File permanently deleted" });
  } catch (err: any) {
    console.error("[trash.ts] error deleting file:", err);
    res.status(500).json({ error: err?.message || "Failed to delete file" });
  }
});

export default router;
