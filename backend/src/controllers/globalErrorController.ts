import { NextFunction, Request, Response } from "express";

export default function globalErrorController(
  err: any,
  req: Request,
  res: Response,
  next: NextFunction,
) {
  console.error(`An error occured 🔥: ${err}`);

  return res.status(500).json({ status: "fail", message: "An error occured" });
}
