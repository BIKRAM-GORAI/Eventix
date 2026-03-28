import Registration from "../models/Registration.js";
import Event from "../models/Event.js";
import generateQR from "../utils/generateQR.js";

// 🔹 APPROVE REGISTRATION
export const approveRegistration = async (req, res) => {
  try {
    const { id } = req.params;

    const registration = await Registration.findById(id);
    if (!registration) {
      return res.status(404).json({ message: "Registration not found" });
    }

    const uniqueData = `${registration._id}-${Date.now()}`;
    const qrCode = await generateQR(uniqueData);


    registration.approvalStatus = "APPROVED";
    registration.qrCode = qrCode;

    await registration.save();

    res.status(200).json({
      message: "Registration approved",
      registration,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// 🔹 REJECT REGISTRATION
export const rejectRegistration = async (req, res) => {
  try {
    const { id } = req.params;

    const registration = await Registration.findById(id);
    if (!registration) {
      return res.status(404).json({ message: "Registration not found" });
    }

    registration.approvalStatus = "REJECTED";

    await registration.save();

    res.status(200).json({
      message: "Registration rejected",
      registration,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};



// 🔹 GET DASHBOARD STATS
export const getDashboardStats = async (req, res) => {
  try {
    const { eventId } = req.params;

    // total registrations
    const totalRegistrations = await Registration.countDocuments({ eventId });

    // total revenue (only SUCCESS payments)
    const revenueData = await Registration.find({
      eventId,
      paymentStatus: "SUCCESS",
    });

    const totalRevenue = revenueData.reduce(
      (sum, reg) => sum + reg.amount,
      0
    );

    // attendance count
    const totalAttendance = await Registration.countDocuments({
      eventId,
      attendance: true,
    });

    res.json({
      totalRegistrations,
      totalRevenue,
      totalAttendance,
    });

  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};