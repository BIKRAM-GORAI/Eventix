import mongoose from "mongoose";

const userSchema = new mongoose.Schema(
  {
    // ── Common fields ──
    name: {
      type: String,
      required: true,
    },

    email: {
      type: String,
      required: true,
      unique: true,
    },

    password: {
      type: String,
      required: true,
    },

    phone: {
      type: String,
      required: true,
    },

    role: {
      type: String,
      enum: ["student", "organizer"],
      required: true,
    },

    profilePhoto: {
      type: String,
    },

    otp: {
      type: String,
    },

    otpExpiry: {
      type: Date,
    },

    isVerified: {
      type: Boolean,
      default: false,
    },

    // ── Student-only fields ──
    dept: {
      type: String,
    },

    rollNo: {
      type: String,
    },

    collegeId: {
      type: String,
    },

    studyingYear: {
      type: Number,
    },

    // ── Organizer-only fields ──
    clubName: {
      type: String,
    },

    clubId: {
      type: String,
    },

    isAdminApproved: {
      type: Boolean,
      default: false,
    },
  },
  { timestamps: true }
);

const User = mongoose.model("User", userSchema);

export default User;
