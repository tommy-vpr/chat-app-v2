import express from "express";

const router = express.Router();

router.get("/signup", (req, res) => {
  res.send("You are signing up");
});

router.get("/login", (req, res) => {
  res.send("You are signing in!");
});

router.get("/logout", (req, res) => {
  res.send("Sign out");
});

export default router;
