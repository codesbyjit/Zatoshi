import { Router } from "express";

const router = Router();

router.post("/register", (req, res) => {
  res.status(201).json({
    message: "Register endpoint",
    data: req.body,
  });
});

router.post("/login", (req, res) => {
  res.status(200).json({
    message: "Login endpoint",
  });
});

router.post("/logout", (_req, res) => {
  res.status(200).json({
    message: "Logout endpoint",
  });
});

router.get("/me", (_req, res) => {
  res.status(200).json({
    user: null,
  });
});

export default router;