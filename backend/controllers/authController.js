import User from "../models/User.js";
import bcrypt from "bcrypt";
import sendEmail from "../utils/sendEmail.js";

// ─── STUDENT SIGNUP ───
export const studentSignup = async (req, res) => {
  try {
    const { name, email, password, phone, dept, rollNo, collegeId, studyingYear } = req.body;

    if (!name || !email || !password || !phone || !dept || !rollNo || !collegeId || !studyingYear) {
      return res.status(400).json({ message: "Please fill all required fields" });
    }

    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ message: "User already exists with this email" });
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    console.log("🔐 Student OTP for", email, "is:", otp);
    const otpExpiry = new Date(Date.now() + 5 * 60 * 1000);

    const user = await User.create({
      name,
      email,
      password: hashedPassword,
      phone,
      role: "student",
      dept,
      rollNo,
      collegeId,
      studyingYear: Number(studyingYear),
      otp,
      otpExpiry,
      isVerified: false,
    });

    await sendEmail(
      email,
      "Verify your EventHub account",
      `<h3>Your OTP is: ${otp}</h3><p>This OTP expires in 5 minutes.</p>`
    );

    res.status(201).json({
      message: "OTP sent to email. Please verify.",
      userId: user._id,
    });
  } catch (error) {
    console.error("🔥 Student signup error:", error);
    res.status(500).json({ message: error.message || "Server error" });
  }
};

// ─── ORGANIZER SIGNUP ───
export const organizerSignup = async (req, res) => {
  try {
    const { name, email, password, phone, clubName, clubId } = req.body;

    if (!name || !email || !password || !phone || !clubName || !clubId) {
      return res.status(400).json({ message: "Please fill all required fields" });
    }

    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ message: "User already exists with this email" });
    }

    // Check if clubId is already taken by another organizer
    const existingClub = await User.findOne({ clubId, role: "organizer" });
    if (existingClub) {
      return res.status(400).json({ message: "This Club ID is already registered" });
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    console.log("🔐 Organizer OTP for", email, "is:", otp);
    const otpExpiry = new Date(Date.now() + 5 * 60 * 1000);

    const user = await User.create({
      name,
      email,
      password: hashedPassword,
      phone,
      role: "organizer",
      clubName,
      clubId,
      otp,
      otpExpiry,
      isVerified: false,
      isAdminApproved: false,
    });

    await sendEmail(
      email,
      "Verify your EventHub organizer account",
      `<h3>Your OTP is: ${otp}</h3><p>This OTP expires in 5 minutes.</p>`
    );

    res.status(201).json({
      message: "OTP sent to email. Please verify.",
      userId: user._id,
    });
  } catch (error) {
    console.error("🔥 Organizer signup error:", error);
    res.status(500).json({ message: error.message || "Server error" });
  }
};

// ─── VERIFY OTP ───
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

    if (user.isVerified) {
      return res.status(400).json({ message: "User already verified" });
    }

    if (user.otp !== otp) {
      return res.status(400).json({ message: "Invalid OTP" });
    }

    if (user.otpExpiry < new Date()) {
      return res.status(400).json({ message: "OTP expired" });
    }

    user.isVerified = true;
    user.otp = undefined;
    user.otpExpiry = undefined;
    await user.save();

    // For organizers, indicate they need admin approval
    if (user.role === "organizer") {
      return res.json({
        message: "Email verified! Your account is pending admin approval.",
        role: "organizer",
        needsApproval: true,
      });
    }

    res.json({ message: "Account verified successfully", role: "student" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// ─── RESEND OTP ───
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

    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    console.log("🔁 Resent OTP for", email, "is:", otp);

    user.otp = otp;
    user.otpExpiry = new Date(Date.now() + 5 * 60 * 1000);
    await user.save();

    await sendEmail(email, "Resend OTP", `<h3>Your new OTP is: ${otp}</h3>`);

    res.json({ message: "OTP resent successfully" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// ─── STUDENT LOGIN ───
export const studentLogin = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ message: "Please enter all fields" });
    }

    const user = await User.findOne({ email, role: "student" });
    if (!user) {
      return res.status(400).json({ message: "Invalid credentials" });
    }

    if (!user.isVerified) {
      return res.status(400).json({ message: "Please verify your email first" });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(400).json({ message: "Invalid credentials" });
    }

    res.status(200).json({
      message: "Login successful",
      user: {
        _id: user._id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        role: "student",
        dept: user.dept,
        rollNo: user.rollNo,
        collegeId: user.collegeId,
        studyingYear: user.studyingYear,
      },
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// ─── ORGANIZER LOGIN ───
export const organizerLogin = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ message: "Please enter all fields" });
    }

    const user = await User.findOne({ email, role: "organizer" });
    if (!user) {
      return res.status(400).json({ message: "Invalid credentials" });
    }

    if (!user.isVerified) {
      return res.status(400).json({ message: "Please verify your email first" });
    }

    if (!user.isAdminApproved) {
      return res.status(403).json({
        message: "Your account is pending admin approval. Please wait for the admin to approve your organizer account.",
        pendingApproval: true,
      });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(400).json({ message: "Invalid credentials" });
    }

    res.status(200).json({
      message: "Login successful",
      user: {
        _id: user._id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        role: "organizer",
        clubName: user.clubName,
        clubId: user.clubId,
      },
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// ─── ADMIN LOGIN (Hardcoded) ───
export const adminLogin = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ message: "Please enter all fields" });
    }

    if (email === process.env.ADMIN_EMAIL && password === process.env.ADMIN_PASS) {
      return res.json({
        message: "Login successful",
        user: {
          _id: "65c123456789abcdef123456",
          name: "System Admin",
          role: "admin",
        },
      });
    }

    return res.status(400).json({ message: "Invalid admin credentials" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
