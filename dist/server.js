"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
// apps/api/server.ts
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const dotenv_1 = __importDefault(require("dotenv"));
const auth_1 = __importDefault(require("./routes/auth"));
const files_1 = __importDefault(require("./routes/files"));
const folders_1 = __importDefault(require("./routes/folders"));
const share_1 = __importDefault(require("./routes/share"));
const trash_1 = __importDefault(require("./routes/trash"));
const link_shares_1 = __importDefault(require("./routes/link-shares"));
const users_1 = __importDefault(require("./routes/users"));
dotenv_1.default.config();
const app = (0, express_1.default)();
const PORT = process.env.PORT || 8080;
app.use((0, cors_1.default)());
app.use(express_1.default.json());
// Routes
app.use("/api/auth", auth_1.default);
console.log("Auth routes mounted at /api/auth");
app.use("/api/files", files_1.default);
app.use("/api/folders", folders_1.default);
app.use("/api/share", share_1.default);
app.use("/api/trash", trash_1.default);
app.use("/api/link-shares", link_shares_1.default);
app.use("/api/users", users_1.default);
app.get("/", (req, res) => {
    res.send("AkaashPeti API is running...");
});
app.listen(PORT, () => {
    console.log(`Server listening on port ${PORT}`);
});
