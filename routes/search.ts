import { Router } from "express";
import { supabase } from "../db";
import { authenticate } from "../middleware/authMiddleware";

const router = Router();

/**
 * Search API
 * GET /api/search?q=term
 */
router.get("/", authenticate, async (req, res) => {
  try {
    const user = (req as any).user;
    const query = req.query.q as string;

    if (!query) {
      return res.status(400).json({ error: "Search query required" });
    }

    // 🔍 Search in folders
    const { data: folders, error: folderError } = await supabase
      .from("folders")
      .select("*")
      .ilike("name", `%${query}%`)
      .eq("owner_id", user.id);

    if (folderError) throw folderError;

    // 🔍 Search in files
    const { data: files, error: fileError } = await supabase
      .from("files")
      .select("*")
      .ilike("name", `%${query}%`)
      .eq("owner_id", user.id);

    if (fileError) throw fileError;

    return res.json({ folders, files });
  } catch (err: any) {
    console.error("❌ [Search] Error:", err.message);
    return res.status(500).json({ error: err.message });
  }
});

export default router;
