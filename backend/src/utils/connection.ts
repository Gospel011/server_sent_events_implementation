import { Request, Response } from "express";

export class Connection {
  req: Request;
  res: Response;
  userId: string;
  id: string;
  canWriteToStream: boolean = true;
  snapshot: string | undefined;
  constructor(req: Request, res: Response, userId: string) {
    this.req = req;
    this.res = res;
    this.userId = userId;
    this.id = crypto.randomUUID();
  }
}
