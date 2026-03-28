import mongoose from "mongoose";

const paymentSchema = new mongoose.Schema(
  {
    registrationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Registration",
      required: true,
    },

    eventId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Event",
      required: true,
    },

    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    teamId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Team",
      default: null,
    },

    amount: {
      type: Number,
      required: true,
    },

    paymentMethod: {
      type: String,
      default: "Demo Payment",
    },

    transactionId: {
      type: String,
      required: true,
      unique: true,
    },

    status: {
      type: String,
      enum: ["SUCCESS", "FAILED", "REFUNDED"],
      default: "SUCCESS",
    },

    paidAt: {
      type: Date,
      default: Date.now,
    },
  },
  { timestamps: true }
);

const Payment = mongoose.model("Payment", paymentSchema);

export default Payment;
