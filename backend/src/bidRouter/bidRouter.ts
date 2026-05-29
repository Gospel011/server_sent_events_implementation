import { Router } from "express";
import authController from "../controllers/authController";
import bidController from "../controllers/bidController";

const router = Router();

router.use(authController.isLoggedIn);
router.post("/", bidController.bid);

export default router;
