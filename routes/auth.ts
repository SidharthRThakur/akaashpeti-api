import { Router, Response } from "express";
import { AuthRequests } from "../types/AuthRequests";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { supabase } from "../db";
import { authenticate, AuthRequest } from "../middleware/authMiddleware"; // ✅ kept for bundle alignment

const router = Router();
const JWT_SECRET = process.env.JWT_SECRET || "supersecret";

// ----------------------
// Signup
// ----------------------
router.post("/signup", async (req: AuthRequests, res: Response) => {
  try {
    const { email, password } = req.body;
    const hashedPassword = await bcrypt.hash(password, 10);

    const { data, error } = await supabase
      .from("users")
      .insert([{ email, password: hashedPassword }])
      .select()
      .single();

    if (error) return res.status(400).json({ error: error.message });

    const token = jwt.sign({ id: data.id, email }, JWT_SECRET, { expiresIn: "7d" });
    res.json({ token, user: { id: data.id, email } });
  } catch (err: any) {
    console.error("[auth.ts] signup error:", err);
    res.status(500).json({ error: "Signup failed" });
  }
});

// ----------------------
// Login
// ----------------------
router.post("/login", async (req: AuthRequests, res: Response) => {
  try {
    const { email, password } = req.body;

    const { data: user, error } = await supabase
      .from("users")
      .select("*")
      .eq("email", email)
      .single();

    if (error || !user) return res.status(401).json({ error: "Invalid credentials" });

    const valid = await bcrypt.compare(password, user.password);
    if (!valid) return res.status(401).json({ error: "Invalid credentials" });

    const token = jwt.sign({ id: user.id, email }, JWT_SECRET, { expiresIn: "7d" });
    res.json({ token, user: { id: user.id, email } });
  } catch (err: any) {
    console.error("[auth.ts] login error:", err);
    res.status(500).json({ error: "Login failed" });
  }
});

export default router;
