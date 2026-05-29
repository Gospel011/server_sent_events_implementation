import { NextFunction, Request, Response } from "express";

export default function asyncHandler(
  fn: (req: Request, res: Response, next: NextFunction) => Promise<void>,
) {
  return function (req: Request, res: Response, next: NextFunction) {
    try {
      fn(req, res, next);
    } catch (error) {
      next(error);
    }
  };
}
