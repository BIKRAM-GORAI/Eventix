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
import paymentRoutes from "./routes/paymentRoutes.js";


dotenv.config();


// connect DB
connectDB();

const app = express();

// middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

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
app.use("/api/payment", paymentRoutes);

// Global error handler (Express 5 compatible)
app.use((err, req, res, next) => {
  console.error("🔥 Global error:", err);
  
  // If headers have already been sent, delegate to Express's default error handler
  if (res.headersSent) {
    return next(err);
  }

  const statusCode = err.status || err.statusCode || 500;
  
  // Extract error message safely if err is not an instance of Error
  let errorMessage = "Internal server error";
  if (err.message) {
    errorMessage = err.message;
  } else if (typeof err === "string") {
    errorMessage = err;
  } else {
    try {
      errorMessage = JSON.stringify(err);
    } catch (e) {
      errorMessage = "Unknown object error";
    }
  }

  res.status(statusCode).json({
    message: errorMessage,
    ...(process.env.NODE_ENV === "development" && { stack: err.stack })
  });
});

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
