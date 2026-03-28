import express from "express";
import { signup, login } from "../controllers/authController.js";
import upload from "../utils/cloudinaryUpload.js";
import { verifyOTP } from "../controllers/authController.js";
import { resendOTP } from "../controllers/authController.js";


const router = express.Router();

// signup — handle file upload errors gracefully (photo is optional)
router.post("/signup", (req, res, next) => {
  upload.single("profilePhoto")(req, res, (err) => {
    if (err) {
      // Cloudinary/multer errors are often non-Error objects → [object Object]
      const errMsg = err instanceof Error
        ? err.message
        : (typeof err === "string" ? err : JSON.stringify(err));
      console.error("Multer/Cloudinary error in signup:", errMsg);

      // Don't block signup for upload failures — continue without photo
      console.log("⚠️ Continuing signup without profile photo due to upload error");
      req.file = null;
    }
    next();
  });
}, signup);

// login
router.post("/login", login);
router.post("/verify-otp", verifyOTP);
router.post("/resend-otp", resendOTP);

export default router;