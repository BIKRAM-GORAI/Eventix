import express from "express";
import { signup, login } from "../controllers/authController.js";
import upload from "../utils/cloudinaryUpload.js";
import { verifyOTP } from "../controllers/authController.js";
import { resendOTP } from "../controllers/authController.js";


const router = express.Router();

// app.use("/uploads", express.static("uploads"));
// signup
// router.post("/signup", signup);
router.post("/signup", upload.single("profilePhoto"), signup);

// login
router.post("/login", login);
router.post("/verify-otp", verifyOTP);
router.post("/resend-otp", resendOTP);

export default router;