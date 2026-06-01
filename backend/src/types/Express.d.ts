import { Express } from "express";

interface User {
  id: string;
  fullName: string;
}

declare global {
  namespace Express {
    interface Request {
      user?: User;
    }
  }
}
