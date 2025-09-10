"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
// apps/api/routes/auth.ts
const express_1 = require("express");
const bcrypt_1 = __importDefault(require("bcrypt"));
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const db_1 = require("../db");
const authMiddleware_1 = require("../middleware/authMiddleware");
const router = (0, express_1.Router)();
/**
 * Register Route
 */
router.post("/signup", async (req, res) => {
    try {
        const { email, password } = req.body;
        if (!email || !password)
            return res.status(400).json({ error: "Email and password required" });
        const { data: existingUser } = await db_1.supabase.from("users").select("id").eq("email", email).single();
        if (existingUser)
            return res.status(400).json({ error: "User already exists" });
        const hashedPassword = await bcrypt_1.default.hash(password, 10);
        const { data, error } = await db_1.supabase.from("users").insert([{ email, password: hashedPassword }]).select().single();
        if (error)
            throw error;
        const token = jsonwebtoken_1.default.sign({ id: data.id, email: data.email }, process.env.JWT_SECRET, { expiresIn: "7d" });
        res.status(201).json({ token, user: { id: data.id, email: data.email } });
    }
    catch (err) {
        console.error("Sigu up Error:", err);
        res.status(500).json({ error: err.message });
    }
});
/**
 * Login Route
 */
router.post("/login", async (req, res) => {
    try {
        const { email, password } = req.body;
        if (!email || !password)
            return res.status(400).json({ error: "Email and password required" });
        const { data: user, error } = await db_1.supabase.from("users").select("*").eq("email", email).single();
        if (error || !user)
            return res.status(400).json({ error: "Invalid email or password" });
        const validPassword = await bcrypt_1.default.compare(password, user.password);
        if (!validPassword)
            return res.status(400).json({ error: "Invalid email or password" });
        const token = jsonwebtoken_1.default.sign({ id: user.id, email: user.email }, process.env.JWT_SECRET, { expiresIn: "7d" });
        res.json({ token, user: { id: user.id, email: user.email } });
    }
    catch (err) {
        console.error("Login Error:", err);
        res.status(500).json({ error: err.message });
    }
});
/**
 * GET /api/auth/me - current user profile
 */
router.get("/me", authMiddleware_1.authenticate, async (req, res) => {
    try {
        const userId = req.user?.id;
        if (!userId)
            return res.status(401).json({ error: "Not authenticated" });
        const { data, error } = await db_1.supabase.from("users").select("id,email,name,image_url,created_at").eq("id", userId).maybeSingle();
        if (error)
            throw error;
        if (!data)
            return res.status(404).json({ error: "User not found" });
        return res.json({ user: data });
    }
    catch (err) {
        console.error("GET /me error:", err);
        return res.status(500).json({ error: err.message });
    }
});
exports.default = router;
