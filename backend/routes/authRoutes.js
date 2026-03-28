import express from "express";
import {
  studentSignup,
  organizerSignup,
  verifyOTP,
  resendOTP,
  studentLogin,
  organizerLogin,
  adminLogin,
} from "../controllers/authController.js";
import upload from "../utils/cloudinaryUpload.js";

const router = express.Router();

// ── Signup routes ──
router.post("/signup/student", (req, res, next) => {
  upload.single("profilePhoto")(req, res, (err) => {
    if (err) {
      console.error("Upload error:", err);
      req.file = null;
    }
    next();
  });
}, studentSignup);

router.post("/signup/organizer", organizerSignup);

// ── OTP routes ──
router.post("/verify-otp", verifyOTP);
router.post("/resend-otp", resendOTP);

// ── Login routes ──
router.post("/login/student", studentLogin);
router.post("/login/organizer", organizerLogin);
router.post("/login/admin", adminLogin);

export default router;