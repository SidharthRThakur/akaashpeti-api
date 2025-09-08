// apps/api/routes/users.ts
import { Router, Response } from "express";
import { AuthRequests } from "../types/AuthRequests";
import { supabase } from "../db";
import { authenticate, AuthRequest } from "../middleware/authMiddleware";

const router = Router();

/**
 * ✅ Get All Users
 * GET /api/users
 */
router.get("/", authenticate, async (req: AuthRequest, res) => {
  try {
    // sirf zaroori fields fetch karte hain (password ya sensitive data nahi)
    const { data, error } = await supabase
      .from("users")
      .select("id, email, name, image_url, created_at")
      .order("created_at", { ascending: true });

    if (error) throw error;

    res.json({ users: data });
  } catch (err: any) {
    console.error("List Users Error:", err);
    res.status(500).json({ error: err.message });
  }
});

export default router;
