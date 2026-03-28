import Registration from "../models/Registration.js";
import Event from "../models/Event.js";
import User from "../models/User.js";
import Team from "../models/Team.js";
import generateQR from "../utils/generateQR.js";
import sendEmail from "../utils/sendEmail.js";
import QRCode from "qrcode";
import PDFDocument from "pdfkit";

// ─── Helper: generate PDF buffer for a single participant ───
const generatePDFBuffer = (data) => {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ margin: 0 });
    const buffers = [];

    doc.on("data", buffers.push.bind(buffers));
    doc.on("end", () => resolve(Buffer.concat(buffers)));
    doc.on("error", reject);

    const width = doc.page.width;
    const height = doc.page.height;

    doc.rect(0, 0, width, height).fill("#111827");
    doc.roundedRect(30, 60, width - 60, 380, 25).fill("#f472b6");
    doc.save().opacity(0.4).roundedRect(30, 60, width - 60, 380, 25).fill("#38bdf8").restore();
    doc.roundedRect(width - 130, 60, 100, 380, 20).fill("#ffffff");

    doc.fillColor("#ffffff").fontSize(14).text("ADMISSION CONFIRMED TO", 60, 85);
    doc.fontSize(30).fillColor("#fff").text(data.eventTitle, 60, 108, { width: width - 210 });

    const badgeY = doc.y + 6;
    if (data.category && data.category !== "Other") {
      doc.roundedRect(60, badgeY, 100, 22, 8).fill("#000");
      doc.fillColor("#fff").fontSize(10).text(data.category.toUpperCase(), 68, badgeY + 6, { width: 84, align: "center" });
    }

    doc.fontSize(16).fillColor("#fff").text(`PASS HOLDER: ${data.userName}`, 60, badgeY + 34);

    const detailY = badgeY + 60;
    doc.fontSize(10).fillColor("#e5e7eb");
    doc.fillColor("#ffffffaa").text("DATE", 60, detailY);
    doc.fillColor("#fff").fontSize(12).text(new Date(data.date).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" }), 60, detailY + 14);
    doc.fontSize(10).fillColor("#ffffffaa").text("VENUE", 60, detailY + 38);
    doc.fillColor("#fff").fontSize(12).text(data.venue, 60, detailY + 52, { width: 180 });

    if (data.startTime) {
      doc.fontSize(10).fillColor("#ffffffaa").text("TIME", 260, detailY);
      doc.fillColor("#fff").fontSize(12).text(`${data.startTime}${data.endTime ? ' - ' + data.endTime : ''}`, 260, detailY + 14);
    }

    if (data.contactEmail) {
      doc.fontSize(10).fillColor("#ffffffaa").text("CONTACT", 260, detailY + 38);
      doc.fillColor("#fff").fontSize(11).text(data.contactEmail, 260, detailY + 52, { width: 180 });
    }

    const passY = detailY + 82;
    doc.roundedRect(60, passY, 120, 28, 10).fill("#000");
    doc.fillColor("#fff").fontSize(11).text("EVENT PASS ✦", 72, passY + 8);

    if (data.qrCodeBuffer) {
      doc.image(data.qrCodeBuffer, width - 118, 100, { fit: [76, 76] });
    }

    doc.fillColor("#000").fontSize(9).text("ADMIT ONE", width - 118, 200);
    doc.moveTo(width - 130, 60).lineTo(width - 130, 440).stroke("#e5e7eb");

    if (data.rules) {
      doc.fontSize(10).fillColor("#6b7280").text("RULES & GUIDELINES", 40, 460);
      doc.fontSize(9).fillColor("#9ca3af").text(data.rules, 40, 476, { width: width - 80, lineGap: 2 });
    }

    doc.fillColor("#9ca3af").fontSize(9).text(
      "Show this QR at entry • Valid for one person only • This ticket is non-transferable",
      0, height - 40, { align: "center" }
    );

    doc.end();
  });
};

// ─── Helper: send ticket to all participants of a registration ───
const sendTicketsForRegistration = async (registration) => {
  const event = await Event.findById(registration.eventId);
  if (!event) throw new Error("Event not found");

  let users = [];

  if (registration.userId && !registration.teamId) {
    const singleUser = await User.findById(registration.userId);
    if (singleUser) users.push(singleUser);
  } else if (registration.teamId) {
    const team = await Team.findById(registration.teamId).populate("members");
    if (team) users = team.members;
  }

  if (users.length === 0) return;

  for (const user of users) {
    const qrData = `${registration._id}-${user._id}`;
    const qrCodeBuffer = await QRCode.toBuffer(qrData);

    const data = {
      eventTitle: event.title,
      userName: user.name,
      venue: event.venue,
      date: event.date,
      category: event.category,
      startTime: event.startTime,
      endTime: event.endTime,
      contactEmail: event.contactEmail,
      rules: event.rules,
      qrCodeBuffer,
    };

    const pdfBuffer = await generatePDFBuffer(data);

    await sendEmail(
      user.email,
      `You are approved! Check your ticket for ${event.title} 🎟️`,
      `<h3>Hello ${user.name},</h3>
       <p>Your registration for <b>${event.title}</b> has been approved! 🎉</p>
       <p><b>Date:</b> ${new Date(event.date).toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" })}${event.startTime ? ' at ' + event.startTime : ''}</p>
       <p><b>Venue:</b> ${event.venue}</p>
       ${event.category ? '<p><b>Category:</b> ' + event.category + '</p>' : ''}
       ${event.rules ? '<p><b>Rules:</b> ' + event.rules + '</p>' : ''}
       <p>Your personal QR ticket is attached. Show this at the entrance.</p>`,
      {
        filename: `Ticket-${event.title.replace(/\s+/g, '-')}-${user.name.replace(/\s+/g, '-')}.pdf`,
        content: pdfBuffer,
        contentType: 'application/pdf',
      }
    );
  }
};

// 🔹 APPROVE REGISTRATION — auto-sends ticket email
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

    // Auto-send ticket email to all participants
    try {
      await sendTicketsForRegistration(registration);
    } catch (emailError) {
      console.error("⚠️ Ticket email failed (registration still approved):", emailError.message);
    }

    res.status(200).json({
      message: "Registration approved and ticket sent!",
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

    const totalRegistrations = await Registration.countDocuments({ eventId });

    const revenueData = await Registration.find({
      eventId,
      paymentStatus: "SUCCESS",
    });

    const totalRevenue = revenueData.reduce((sum, reg) => sum + reg.amount, 0);

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