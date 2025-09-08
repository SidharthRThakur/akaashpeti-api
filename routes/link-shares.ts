// apps/api/routes/link-shares.ts
import { Router, Request, Response } from "express";
import { authenticate } from "../middleware/authMiddleware";
import { supabase } from "../db";
import { randomUUID } from "crypto";
import { AuthRequests } from "../types/AuthRequests";

const router = Router();

/**
 * ✅ List all public links for authenticated user
 * GET /api/link-shares
 */
router.get("/", authenticate, async (req: Request & { user?: any }, res: Response) => {
  try {
    const user = req.user;
    if (!user?.id) {
      return res.status(401).json({ error: "User not authenticated" });
    }

    const { data, error } = await supabase
      .from("link_shares")
      .select("*")
      .eq("owner_id", user.id);

    if (error) throw error;

    res.json({ links: data || [] });
  } catch (err: any) {
    console.error("List LinkShares Error:", err);
    res.status(500).json({ error: err.message });
  }
});

/**
 * ✅ Create Public Link
 * POST /api/link-shares
 * Body: { resource_id: string, resource_type: "file" | "folder", expires_at?: string }
 */
router.post("/", authenticate, async (req: Request & { user?: any }, res: Response) => {
  try {
    const user = req.user;
    if (!user?.id) {
      return res.status(401).json({ error: "User not authenticated" });
    }

    const { resource_id, resource_type, expires_at } = req.body;
    if (!resource_id || !resource_type) {
      return res
        .status(400)
        .json({ error: "resource_id and resource_type are required" });
    }

    const token = randomUUID();

    const { data, error } = await supabase
      .from("link_shares")
      .insert([
        {
          resource_id,
          resource_type,
          token,
          expires_at: expires_at || null,
          owner_id: user.id,
        },
      ])
      .select()
      .single();

    if (error) throw error;

    res.status(201).json({
      message: "Public link created successfully",
      link: `${
        process.env.APP_URL || "http://localhost:8080"
      }/api/link-shares/${token}`,
      share: data,
    });
  } catch (err: any) {
    console.error("Create LinkShare Error:", err);
    res.status(500).json({ error: err.message });
  }
});

/**
 * ✅ Resolve Public Link
 * GET /api/link-shares/:token
 */
router.get("/:token", async (req: Request, res: Response) => {
  try {
    const { token } = req.params;

    const { data: linkShare, error } = await supabase
      .from("link_shares")
      .select("*")
      .eq("token", token)
      .single();

    if (error || !linkShare) {
      return res.status(404).json({ error: "Invalid or expired link" });
    }

    // Expiry check
    if (linkShare.expires_at && new Date(linkShare.expires_at) < new Date()) {
      return res.status(410).json({ error: "Link expired" });
    }

    let resource: any = null;

    if (linkShare.resource_type === "file") {
      const { data: file, error: fileErr } = await supabase
        .from("files")
        .select("*")
        .eq("id", linkShare.resource_id)
        .single();

      if (fileErr || !file) {
        return res.status(404).json({ error: "File not found" });
      }

      const { data: signedUrlData, error: urlErr } = await supabase.storage
        .from("files")
        .createSignedUrl(file.storage_path, 60 * 60);

      if (urlErr) {
        return res.status(500).json({ error: "Could not generate file link" });
      }

      resource = { ...file, signed_url: signedUrlData.signedUrl };
    } else if (linkShare.resource_type === "folder") {
      const { data: folder, error: folderErr } = await supabase
        .from("folders")
        .select("*")
        .eq("id", linkShare.resource_id)
        .single();

      if (folderErr || !folder) {
        return res.status(404).json({ error: "Folder not found" });
      }

      const { data: contents, error: contentsErr } = await supabase
        .from("files")
        .select("*")
        .eq("parent_id", folder.id);

      if (contentsErr) {
        return res
          .status(500)
          .json({ error: "Could not fetch folder contents" });
      }

      resource = { ...folder, contents };
    }

    res.json({
      link_share: linkShare,
      resource,
    });
  } catch (err: any) {
    console.error("Resolve LinkShare Error:", err);
    res.status(500).json({ error: err.message });
  }
});

/**
 * ✅ Delete / Revoke Public Link
 * DELETE /api/link-shares/:id
 */
router.delete("/:id", authenticate, async (req: Request & { user?: any }, res: Response) => {
  try {
    const user = req.user;
    if (!user?.id) {
      return res.status(401).json({ error: "User not authenticated" });
    }

    const { id } = req.params;

    const { data, error } = await supabase
      .from("link_shares")
      .delete()
      .eq("id", id)
      .eq("owner_id", user.id)
      .select()
      .single();

    if (error) throw error;

    res.json({ message: "Public link revoked", deleted: data });
  } catch (err: any) {
    console.error("Delete LinkShare Error:", err);
    res.status(500).json({ error: err.message });
  }
});

export default router;
