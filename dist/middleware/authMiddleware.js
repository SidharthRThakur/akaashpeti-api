"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.authenticate = void 0;
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
/**
 * Authentication middleware
 * - Reads Authorization header
 * - Verifies JWT token
 * - Attaches user payload to req.user
 */
const authenticate = (req, res, next) => {
    try {
        const authHeader = req.headers["authorization"];
        const token = authHeader && authHeader.split(" ")[1];
        if (!token) {
            return res.status(401).json({ message: "Access token missing" });
        }
        jsonwebtoken_1.default.verify(token, process.env.JWT_SECRET, (err, user) => {
            if (err) {
                return res.status(403).json({ message: "Invalid or expired token" });
            }
            req.user = user;
            next();
        });
    }
    catch (err) {
        console.error("Auth middleware error:", err);
        return res.status(500).json({ message: "Authentication failed" });
    }
};
exports.authenticate = authenticate;
