import express, { Request, Response } from "express";
import cors from "cors";
import authRoutes from "./routes/auth";
import fileRoutes from "./routes/files";
import folderRoutes from "./routes/folders";
import trashRoutes from "./routes/trash";
import shareRoutes from "./routes/share";
import linkShareRoutes from "./routes/link-shares";

const app = express();
const PORT = process.env.PORT || 8080;

// Middleware
app.use(cors());


app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Health check for Render
app.get("/healthz", (req: Request, res: Response) => {
  res.json({ status: "ok", message: "Service is healthy" });
});

// Your other health check (optional)
app.get("/api/health", (req: Request, res: Response) => {
  res.json({ status: "ok", message: "Akaash-Peti backend running" });
});

// Mount routes
app.use("/api/auth", authRoutes);
app.use("/api/files", fileRoutes);
app.use("/api/folders", folderRoutes);
app.use("/api/trash", trashRoutes);
app.use("/api/share", shareRoutes);
// app.use("/api", shareRoutes);
app.use("/api/link-shares", linkShareRoutes)
// Start server
app.listen(PORT, () => {
  console.log(`🚀 Server listening on port ${PORT}`);
  console.log("Auth routes mounted at /api/auth");
  console.log("File routes mounted at /api/files");
  console.log("Folder routes mounted at /api/folders");
  console.log("Trash routes mounted at /api/trash");
  console.log("Share routes mounted at /api/share");
});
