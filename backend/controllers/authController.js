import User from "../models/User.js";
import bcrypt from "bcrypt";
import sendEmail from "../utils/sendEmail.js";

export const signup = async (req, res) => {
  try {
    const { name, email, password, collegeName, age, gender, phone, role } =
      req.body;

    if (!name || !email || !password || !collegeName || !phone) {
      return res
        .status(400)
        .json({ message: "Please fill all required fields" });
    }

    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ message: "User already exists" });
    }

    // 🔐 hash password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // 🔢 generate OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();

    console.log("🔐 OTP for", email, "is:", otp);

    const otpExpiry = new Date(Date.now() + 5 * 60 * 1000); // 5 mins

    const profilePhoto = req.body ? req.body.path : "";

    // create user (NOT verified yet)
    const user = await User.create({
      name,
      email,
      password: hashedPassword,
      collegeName,
      age,
      gender,
      phone,
      role,
      profilePhoto,
      otp,
      otpExpiry,
      isVerified: false,
    });

    // 📧 send OTP email
    await sendEmail(
      email,
      "Verify your account",
      `<h3>Your OTP is: ${otp}</h3>`,
    );

    res.status(201).json({
      message: "OTP sent to email. Please verify.",
      userId: user._id,
    });
  } catch (error) {
    console.error("🔥 Error in signup controller:", error);
    try {
      res.status(500).json({ message: error instanceof Error ? error.message : "Stringified: " + JSON.stringify(error) });
    } catch (e) {
      console.error("🔥 Error serializing error in signup controller:", e);
      res.status(500).send("Fatal error format");
    }
  }
};

// 🔹 LOGIN
export const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    // validation
    if (!email || !password) {
      return res.status(400).json({ message: "Please enter all fields" });
    }

    // 🔹 Check Hardcoded Admin Credentials
    if (
      email === process.env.ADMIN_EMAIL &&
      password === process.env.ADMIN_PASS
    ) {
      return res.json({
        message: "Login successful",
        user: { _id: "65c123456789abcdef123456", name: "System Admin", role: "admin" },
      });
    }

    // check user
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(400).json({ message: "Invalid credentials" });
    }
    if (!user.isVerified) {
      return res
        .status(400)
        .json({ message: "Please verify your email first" });
    }

    // compare password
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(400).json({ message: "Invalid credentials" });
    }

    res.status(200).json({
      message: "Login successful",
      user: {
        ...user._doc,
        role: user.role || "student",
      },
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const verifyOTP = async (req, res) => {
  try {
    const { userId, otp } = req.body;

    if (!userId || !otp) {
      return res.status(400).json({ message: "Missing fields" });
    }

    const user = await User.findById(userId);

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    // ❌ already verified
    if (user.isVerified) {
      return res.status(400).json({ message: "User already verified" });
    }

    // ❌ OTP mismatch
    if (user.otp !== otp) {
      return res.status(400).json({ message: "Invalid OTP" });
    }

    // ⏳ OTP expired
    if (user.otpExpiry < new Date()) {
      return res.status(400).json({ message: "OTP expired" });
    }

    // ✅ success
    user.isVerified = true;
    user.otp = undefined;
    user.otpExpiry = undefined;

    await user.save();

    res.json({ message: "Account verified successfully" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const resendOTP = async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ message: "Email required" });
    }

    const user = await User.findOne({ email });

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    if (user.isVerified) {
      return res.status(400).json({ message: "User already verified" });
    }

    // 🔢 generate new OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();

    console.log("🔁 Resent OTP for", email, "is:", otp);

    user.otp = otp;
    user.otpExpiry = new Date(Date.now() + 5 * 60 * 1000);

    await user.save();

    // 📧 send email
    await sendEmail(email, "Resend OTP", `<h3>Your new OTP is: ${otp}</h3>`);

    res.json({ message: "OTP resent successfully" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
