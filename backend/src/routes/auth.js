import express from "express";
import {
  signUpController,
  logout,
  login,
} from "../controllers/authController.js";

const router = express.Router();

router.post("/signup", signUpController);

router.post("/login", login);

router.post("/logout", logout);

export default router;
