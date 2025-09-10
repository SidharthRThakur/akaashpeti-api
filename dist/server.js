"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const auth_1 = __importDefault(require("./routes/auth"));
const files_1 = __importDefault(require("./routes/files"));
const folders_1 = __importDefault(require("./routes/folders"));
const trash_1 = __importDefault(require("./routes/trash"));
const share_1 = __importDefault(require("./routes/share"));
const app = (0, express_1.default)();
const PORT = process.env.PORT || 8080;
// Middleware
app.use((0, cors_1.default)());
app.use(express_1.default.json());
app.use(express_1.default.urlencoded({ extended: true }));
// Health check for Render
app.get("/healthz", (req, res) => {
    res.json({ status: "ok", message: "Service is healthy" });
});
// Your other health check (optional)
app.get("/api/health", (req, res) => {
    res.json({ status: "ok", message: "Akaash-Peti backend running" });
});
// Mount routes
app.use("/api/auth", auth_1.default);
app.use("/api/files", files_1.default);
app.use("/api/folders", folders_1.default);
app.use("/api/trash", trash_1.default);
app.use("/api/share", share_1.default);
// Start server
app.listen(PORT, () => {
    console.log(`🚀 Server listening on port ${PORT}`);
    console.log("Auth routes mounted at /api/auth");
    console.log("File routes mounted at /api/files");
    console.log("Folder routes mounted at /api/folders");
    console.log("Trash routes mounted at /api/trash");
    console.log("Share routes mounted at /api/share");
});
