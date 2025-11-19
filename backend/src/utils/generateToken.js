import jwt from "jsonwebtoken";
import { ENV } from "../lib/env.js";

export const generateToken = (res, userId, email) => {
  const token = jwt.sign({ id: userId, email }, ENV.JWT_SECRET, {
    expiresIn: "7d",
  });

  // Send token in HTTP-only cookie
  res.cookie("jwt", token, {
    httpOnly: true,
    secure: ENV.NODE_ENV === "production", // send only over HTTPS in prod
    sameSite: "strict",
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
  });

  return token;
};
