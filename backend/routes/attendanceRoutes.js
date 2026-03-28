import express from "express";
import { scanQR, getAttendanceSummary, getAttendanceByEvent } from "../controllers/attendanceController.js";

const router = express.Router();

// Scan QR code at the gate
router.post("/scan", scanQR);

// Analytics: overview of all events with attendance stats
router.get("/summary", getAttendanceSummary);

// Analytics: detailed attendance for a specific event
router.get("/event/:eventId", getAttendanceByEvent);

export default router;