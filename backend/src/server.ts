import express from "express";
import morgan from "morgan";
import "dotenv/config";
import authRouter from "./authRouter/authRouter";
import bidRouter from "./bidRouter/bidRouter";
import sseRouter from "./sseRouter/sseRouter";
import globalErrorController from "./controllers/globalErrorController";
import cors from "cors";
const app = express();

app.use(
  cors({
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    origin: ["http://localhost:5173"],
    credentials: true,
  }),
);

app.use(morgan("dev"));
app.use(express.json());

app.use("/auth", authRouter);
app.use("/bids", bidRouter);
app.use("/events", sseRouter);

app.use((req, res, next) => {
  res
    .status(404)
    .json({ status: "failed", message: "That route is not defined" });
});

app.use(globalErrorController);

const PORT = process.env.PORT;

app.listen(PORT, () => {
  console.log(`App is listening on port: ${PORT}`);
});
