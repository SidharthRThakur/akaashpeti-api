import { Request } from "express";
import type { File as MulterFile } from "multer"; // ✅ import multer's File type

export interface AuthRequests extends Request {
  user?: {
    id: string;
    email: string;
  };
  body: any;
  params: any;
  file?: MulterFile;           // ✅ correct typing
  files?: MulterFile[];        // ✅ allow multiple uploads
}
