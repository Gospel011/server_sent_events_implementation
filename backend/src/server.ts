import express from "express";
import morgan from "morgan";
import "dotenv/config";
import sseRouter from "./sseRouter/sseRouter";
import globalErrorController from "./controllers/globalErrorController";
const app = express();

app.use(morgan("dev"));
app.use(express.json());

app.use("/events", sseRouter);

app.use(globalErrorController);

const PORT = process.env.PORT ?? 8000;

app.listen(PORT, () => {
  console.log(`App is listening on port: ${PORT}`);
});
