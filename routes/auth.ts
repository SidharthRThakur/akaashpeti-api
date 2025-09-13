// apps/api/routes/auth.ts
import { Router, Response } from "express";
import { AuthRequests } from "../types/AuthRequests";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { supabase } from "../db";
import { authenticate, AuthRequest } from "../middleware/authMiddleware";

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

// ----------------------
// Forgot Password (send reset email)
// ----------------------
router.post("/forgot-password", async (req: AuthRequests, res: Response) => {
  try {
    const { email } = req.body;

    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${process.env.FRONTEND_URL}/auth/reset-password`,
    });

    if (error) return res.status(400).json({ error: error.message });

    res.json({ message: "Password reset email sent" });
  } catch (err: any) {
    console.error("[auth.ts] forgot-password error:", err);
    res.status(500).json({ error: "Failed to send reset email" });
  }
});

// ----------------------
// Reset Password (set new password)
// ----------------------
router.post("/reset-password", async (req: AuthRequests, res: Response) => {
  try {
    const { access_token, newPassword } = req.body;

    if (!access_token || !newPassword) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    // ✅ FIXED: Set session first, then update password
    const { error: sessionError } = await supabase.auth.setSession({
      access_token,
      refresh_token: "",
    });

    if (sessionError) {
      return res.status(400).json({ error: sessionError.message });
    }

    const { error: updateError } = await supabase.auth.updateUser({
      password: newPassword,
    });

    if (updateError) {
      return res.status(400).json({ error: updateError.message });
    }

    res.json({ message: "Password reset successful" });
  } catch (err: any) {
    console.error("[auth.ts] reset-password error:", err);
    res.status(500).json({ error: "Password reset failed" });
  }
});

export default router;
