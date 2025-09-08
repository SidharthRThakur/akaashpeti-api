import { Request } from "express";

export interface AuthRequests extends Request {
  user?: {
    id: string;
    email: string;
  };
  body: any;
  params: any;
  file?: Express.Multer.File;
  files?: Express.Multer.File[] | { [fieldname: string]: Express.Multer.File[] };
}
//new used 
