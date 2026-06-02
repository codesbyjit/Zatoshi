import { Router } from "express";

const router = Router();

router.get("/:id", (req, res) => {
  res.json({
    id: req.params.id,
    name: "Demo User",
  });
});

router.put("/:id", (req, res) => {
  res.json({
    message: "Profile updated",
    userId: req.params.id,
    data: req.body,
  });
});

router.get("/:id/addresses", (req, res) => {
  res.json({
    userId: req.params.id,
    addresses: [],
  });
});

export default router;