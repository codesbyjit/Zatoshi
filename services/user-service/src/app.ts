import express from "express";
import cors from "cors";

import userRoutes from "./router/user.router.js";

const app = express();

app.use(cors());

app.use(express.json());

app.get("/health", (_, res) => {
  res.status(200).json({
    service: "auth-service",
    status: "healthy",
  });
});

app.use("/", userRoutes);

export default app;