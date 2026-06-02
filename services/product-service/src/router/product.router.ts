import { Router } from "express";

const router = Router();

router.get("/", (_req, res) => {
  res.json([
    {
      id: "1",
      name: "T-Shirt",
      price: 0.00025,
    },
    {
      id: "2",
      name: "Shirt",
      price: 0.00050,
    },
    {
      id: "3",
      name: "Pant",
      price: 0.00045,
    },
  ]);
});

router.get("/:id", (req, res) => {
  res.json({
    id: req.params.id,
    name: "Bitcoin T-Shirt",
    price: 0.00025,
  });
});

router.post("/", (req, res) => {
  res.status(201).json({
    message: "Product created",
    data: req.body,
  });
});

router.put("/:id", (req, res) => {
  res.json({
    message: "Product updated",
    id: req.params.id,
  });
});

router.delete("/:id", (req, res) => {
  res.json({
    message: "Product deleted",
    id: req.params.id,
  });
});

export default router;