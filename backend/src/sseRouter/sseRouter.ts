import { Router } from "express";
import sseController from "../controllers/sseController";
const router = Router();

router.get("/", sseController.handleSSEConnection);

export default router;
