import express from "express";
import {
  processPayment,
  getPaymentAnalytics,
  getEventPayments,
} from "../controllers/paymentController.js";

const router = express.Router();

// Process a demo payment
router.post("/process", processPayment);

// Get payment analytics (admin)
router.get("/analytics", getPaymentAnalytics);

// Get payments for a specific event
router.get("/event/:eventId", getEventPayments);

export default router;
