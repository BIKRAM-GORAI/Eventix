import Payment from "../models/Payment.js";
import Registration from "../models/Registration.js";
import Event from "../models/Event.js";
import crypto from "crypto";

// Process a demo payment
export const processPayment = async (req, res) => {
  try {
    const { registrationId, eventId, userId, teamId, amount } = req.body;

    if (!registrationId || !eventId || !userId || !amount) {
      return res.status(400).json({ message: "Missing required payment fields" });
    }

    // Check registration exists
    const registration = await Registration.findById(registrationId);
    if (!registration) {
      return res.status(404).json({ message: "Registration not found" });
    }

    // Check if already paid
    const existingPayment = await Payment.findOne({ registrationId, status: "SUCCESS" });
    if (existingPayment) {
      return res.status(400).json({ message: "Payment already completed for this registration" });
    }

    // Generate a fake transaction ID
    const transactionId = "TXN_" + crypto.randomBytes(8).toString("hex").toUpperCase();

    // Create payment record
    const payment = await Payment.create({
      registrationId,
      eventId,
      userId,
      teamId: teamId || null,
      amount: Number(amount),
      transactionId,
      status: "SUCCESS",
      paidAt: new Date(),
    });

    // Update registration payment status
    registration.paymentStatus = "SUCCESS";
    registration.amount = Number(amount);
    await registration.save();

    res.status(201).json({
      message: "Payment successful!",
      payment,
      transactionId,
    });
  } catch (error) {
    console.error("Payment error:", error);
    res.status(500).json({ message: "Payment processing failed: " + error.message });
  }
};

// Get all payment analytics
export const getPaymentAnalytics = async (req, res) => {
  try {
    const payments = await Payment.find({ status: "SUCCESS" })
      .populate("eventId", "title date category")
      .populate("userId", "name email collegeName")
      .populate("teamId", "teamName")
      .sort({ paidAt: -1 });

    // Aggregate by event
    const eventMap = {};
    let totalRevenue = 0;

    payments.forEach((p) => {
      totalRevenue += p.amount;
      const eventKey = p.eventId?._id?.toString();
      if (!eventKey) return;

      if (!eventMap[eventKey]) {
        eventMap[eventKey] = {
          eventId: eventKey,
          title: p.eventId.title,
          category: p.eventId.category,
          date: p.eventId.date,
          totalAmount: 0,
          count: 0,
          payments: [],
        };
      }
      eventMap[eventKey].totalAmount += p.amount;
      eventMap[eventKey].count += 1;
      eventMap[eventKey].payments.push({
        _id: p._id,
        transactionId: p.transactionId,
        amount: p.amount,
        paidAt: p.paidAt,
        userName: p.userId?.name || "Unknown",
        userEmail: p.userId?.email || "",
        teamName: p.teamId?.teamName || null,
        status: p.status,
      });
    });

    const eventBreakdown = Object.values(eventMap).sort((a, b) => b.totalAmount - a.totalAmount);

    res.json({
      totalRevenue,
      totalTransactions: payments.length,
      averageAmount: payments.length > 0 ? Math.round(totalRevenue / payments.length) : 0,
      eventBreakdown,
    });
  } catch (error) {
    console.error("Analytics error:", error);
    res.status(500).json({ message: "Failed to fetch analytics: " + error.message });
  }
};

// Get payments for a specific event
export const getEventPayments = async (req, res) => {
  try {
    const { eventId } = req.params;

    const payments = await Payment.find({ eventId })
      .populate("userId", "name email collegeName")
      .populate("teamId", "teamName")
      .sort({ paidAt: -1 });

    const totalAmount = payments.reduce((sum, p) => sum + p.amount, 0);

    res.json({
      eventId,
      totalAmount,
      totalPayments: payments.length,
      payments: payments.map((p) => ({
        _id: p._id,
        transactionId: p.transactionId,
        amount: p.amount,
        status: p.status,
        paidAt: p.paidAt,
        userName: p.userId?.name || "Unknown",
        userEmail: p.userId?.email || "",
        userCollege: p.userId?.collegeName || "",
        teamName: p.teamId?.teamName || null,
      })),
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
