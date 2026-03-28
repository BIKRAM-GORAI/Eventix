import express from "express";
import dotenv from "dotenv";
import cors from "cors";
import connectDB from "./config/db.js";

import authRoutes from "./routes/authRoutes.js";
import eventRoutes from "./routes/eventRoutes.js";
import registrationRoutes from "./routes/registrationRoutes.js";
import teamRoutes from "./routes/teamRoutes.js";
import organizerRoutes from "./routes/organizerRoutes.js";
import attendanceRoutes from "./routes/attendanceRoutes.js";
import path from "path";
import ticketRoutes from "./routes/ticketRoutes.js";


dotenv.config();


// connect DB
connectDB();

const app = express();

// middleware
app.use(cors());
app.use(express.json());

// test route
app.get("/", (req, res) => {
  res.send("API is running...");
});

app.use("/api/auth", authRoutes);
app.use("/api/events", eventRoutes);
app.use("/api/registration", registrationRoutes);
app.use("/api/team", teamRoutes);
app.use("/api/organizer", organizerRoutes);
app.use("/api/attendance", attendanceRoutes);
app.use("/uploads", express.static("uploads"));
app.use("/api/ticket", ticketRoutes);

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
