import type { Request, Response, NextFunction } from "express";

export function requireAdmin(req: Request, res: Response, next: NextFunction) {
  if (req.session.adminAuthenticated) {
    return next();
  }
  res.status(401).json({ error: "Unauthorized" });
}
