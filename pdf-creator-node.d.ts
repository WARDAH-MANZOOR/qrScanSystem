import { JwtPayload } from "jsonwebtoken";
import { Request } from "express";
declare module "pdf-creator-node";

// Extend the Request interface
declare global {
  namespace Express {
    interface Request {
      user?: string | JwtPayload;
    }
  }
}
