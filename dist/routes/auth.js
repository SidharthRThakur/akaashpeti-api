"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const bcrypt_1 = __importDefault(require("bcrypt"));
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const db_1 = require("../db");
const router = (0, express_1.Router)();
const JWT_SECRET = process.env.JWT_SECRET || "supersecret";
// ----------------------
// Signup
// ----------------------
router.post("/signup", async (req, res) => {
    try {
        const { email, password } = req.body;
        const hashedPassword = await bcrypt_1.default.hash(password, 10);
        const { data, error } = await db_1.supabase
            .from("users")
            .insert([{ email, password: hashedPassword }])
            .select()
            .single();
        if (error)
            return res.status(400).json({ error: error.message });
        const token = jsonwebtoken_1.default.sign({ id: data.id, email }, JWT_SECRET, { expiresIn: "7d" });
        res.json({ token, user: { id: data.id, email } });
    }
    catch (err) {
        console.error("[auth.ts] signup error:", err);
        res.status(500).json({ error: "Signup failed" });
    }
});
// ----------------------
// Login
// ----------------------
router.post("/login", async (req, res) => {
    try {
        const { email, password } = req.body;
        const { data: user, error } = await db_1.supabase
            .from("users")
            .select("*")
            .eq("email", email)
            .single();
        if (error || !user)
            return res.status(401).json({ error: "Invalid credentials" });
        const valid = await bcrypt_1.default.compare(password, user.password);
        if (!valid)
            return res.status(401).json({ error: "Invalid credentials" });
        const token = jsonwebtoken_1.default.sign({ id: user.id, email }, JWT_SECRET, { expiresIn: "7d" });
        res.json({ token, user: { id: user.id, email } });
    }
    catch (err) {
        console.error("[auth.ts] login error:", err);
        res.status(500).json({ error: "Login failed" });
    }
});
exports.default = router;
