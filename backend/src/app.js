import express from "express";
import dotenv from "dotenv";

import authRoutes from "./routes/auth.js";
import messageRoutes from "./routes/message.js";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// Routes
app.use("/api/auth", authRoutes);
app.use("/api/messages", messageRoutes);

app.listen(PORT, () => console.log("Server is running on port 3000"));
