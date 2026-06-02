import express from "express";
import cors from "cors";

import productRoutes from "./router/product.router.js";

const app = express();

app.use(cors());
app.use(express.json());

app.get("/health", (_, res) => {
  res.json({
    service: "product-service",
    status: "healthy",
  });
});

app.use("/", productRoutes);

export default app;