import express from "express";
import { config } from "dotenv";
import cors from "cors";
import cookieParser from "cookie-parser";
import router from "./proxy/router.js";

config();

const app = express();

app.use(express.json());
app.use(cookieParser());
app.use(
  cors({
    origin: process.env.FRONTEND_URL || "http://localhost:3000",
    credentials: true,
  }),
);

app.get("/", (_, res) => {
  res.status(200).json("Hello this is Zatoshi api");
});

app.use("/api/v1", router);

app.listen(process.env.PORT || 4000, () => {
  console.log(`Server is running on PORT: ${process.env.PORT || 4000}`);
});