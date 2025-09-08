// apps/api/server.ts
import express from "express";
import cors from "cors";
import dotenv from "dotenv";

import authRoutes from "./routes/auth";
import fileRoutes from "./routes/files";
import folderRoutes from "./routes/folders";
import shareRoutes from "./routes/share";
import trashRoutes from "./routes/trash";
import linkShareRoutes from "./routes/link-shares";
import usersRoutes from "./routes/users";
dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

// Routes
app.use("/api/auth", authRoutes);console.log("Auth routes mounted at /api/auth");
app.use("/api/files", fileRoutes);
app.use("/api/folders", folderRoutes);
app.use("/api/share", shareRoutes);
app.use("/api/trash", trashRoutes);
app.use("/api/link-shares", linkShareRoutes);
app.use("/api/users", usersRoutes);

app.get("/", (req, res) => {
  res.send("AkaashPeti API is running...");
});

app.listen(PORT, () => {
  console.log(`Server listening on port ${PORT}`);
});
