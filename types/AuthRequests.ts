import { Request } from "express";

export interface AuthRequests extends Request {
  user?: {
    id: string;
    email: string;
  };
  body: any;
  params: any;
}