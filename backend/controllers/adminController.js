import User from "../models/User.js";
import sendEmail from "../utils/sendEmail.js";

// ─── GET PENDING ORGANIZERS ───
export const getPendingOrganizers = async (req, res) => {
  try {
    const pendingOrganizers = await User.find({
      role: "organizer",
      isVerified: true,
      isAdminApproved: false,
    }).select("-password -otp -otpExpiry");

    res.json(pendingOrganizers);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// ─── GET ALL APPROVED ORGANIZERS ───
export const getApprovedOrganizers = async (req, res) => {
  try {
    const organizers = await User.find({
      role: "organizer",
      isVerified: true,
      isAdminApproved: true,
    }).select("-password -otp -otpExpiry");

    res.json(organizers);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// ─── APPROVE ORGANIZER ───
export const approveOrganizer = async (req, res) => {
  try {
    const { id } = req.params;

    const user = await User.findById(id);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    if (user.role !== "organizer") {
      return res.status(400).json({ message: "User is not an organizer" });
    }

    if (user.isAdminApproved) {
      return res.status(400).json({ message: "Already approved" });
    }

    user.isAdminApproved = true;
    await user.save();

    // Send approval email
    await sendEmail(
      user.email,
      "Your EventHub Organizer Account is Approved! 🎉",
      `<h3>Congratulations ${user.name}!</h3>
       <p>Your organizer account for <b>${user.clubName}</b> (ID: ${user.clubId}) has been approved by the admin.</p>
       <p>You can now <a href="http://localhost:5500/frontend/login-organizer.html">login</a> and start creating events!</p>`
    );

    res.json({ message: "Organizer approved successfully", user });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// ─── REJECT ORGANIZER ───
export const rejectOrganizer = async (req, res) => {
  try {
    const { id } = req.params;

    const user = await User.findById(id);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    if (user.role !== "organizer") {
      return res.status(400).json({ message: "User is not an organizer" });
    }

    // Send rejection email before deleting
    await sendEmail(
      user.email,
      "EventHub Organizer Account Update",
      `<h3>Hello ${user.name},</h3>
       <p>Unfortunately, your organizer account application for <b>${user.clubName}</b> has not been approved at this time.</p>
       <p>Please contact the admin for more details.</p>`
    );

    await User.findByIdAndDelete(id);

    res.json({ message: "Organizer rejected and removed" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
