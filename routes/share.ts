import { Router, Response } from "express";
import { supabase } from "../db";
import { authenticate } from "../middleware/authMiddleware";
import { AuthRequests } from "../types/AuthRequests";

const router = Router();

// ----------------------
// Share a file
// ----------------------
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

    const { data: share, error: shareError } = await supabase
      .from("shares")
      .insert([
        {
          file_id,
          shared_with: user.id, // ✅ correct UUID
          access_level,
          owner_id: ownerId,
          created_at: new Date().toISOString(),
        },
      ])
      .select()
      .single();

    if (shareError) throw shareError;
    res.json({ message: "File shared", share });
  } catch (err: any) {
    console.error("[share.ts] error:", err);
    res.status(500).json({ error: err?.message || "Share failed" });
  }
});

export default router;
