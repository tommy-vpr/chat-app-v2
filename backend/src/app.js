import express from "express";
import cookieParser from "cookie-parser";
import dotenv from "dotenv";
import path from "path";

import authRoutes from "./routes/auth.js";
import messageRoutes from "./routes/message.js";
import { connectDB } from "./lib/db.js";
import { ENV } from "./lib/env.js";

dotenv.config();

const app = express();
app.set("trust proxy", true); // ✅ Fix Arcjet seeing proxy IPs

const __dirname = path.resolve();
const PORT = ENV.PORT || 3000;

app.use(express.json());
app.use(cookieParser());

app.use((req, res, next) => {
  console.log(
    "🕵️ Client IP:",
    req.ip,
    "Forwarded for:",
    req.headers["x-forwarded-for"]
  );
  next();
});

// API Routes
app.use("/api/auth", authRoutes);
app.use("/api/messages", messageRoutes);

// ✅ Serve frontend in production
if (ENV.NODE_ENV === "production") {
  const frontendPath = path.join(__dirname, "../frontend/dist");
  console.log("📦 Serving frontend from:", frontendPath);

  app.use(express.static(frontendPath));

  app.get("*", (req, res) => {
    res.sendFile(path.join(frontendPath, "index.html"));
  });
}

app.listen(PORT, () => {
  console.log(`✅ Server running on port ${PORT}`);
  connectDB();
});
