
import Registration from "../models/Registration.js";
import Event from "../models/Event.js";
import User from "../models/User.js";
import sendEmail from "../utils/sendEmail.js";
import PDFDocument from "pdfkit";
import Team from "../models/Team.js";
import QRCode from "qrcode";


// 🔹 helper: generate PDF buffer for a single participant
const generatePDFBuffer = (data) => {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ margin: 0 });
    const buffers = [];

    doc.on("data", buffers.push.bind(buffers));
    doc.on("end", () => resolve(Buffer.concat(buffers)));
    doc.on("error", reject);

    const width = doc.page.width;
    const height = doc.page.height;

    // ===== BACKGROUND =====
    doc.rect(0, 0, width, height).fill("#111827");

    // ===== MAIN TICKET CARD =====
    doc.roundedRect(30, 60, width - 60, 380, 25).fill("#f472b6");

    // overlay layer for "gradient feel"
    doc
      .save()
      .opacity(0.4)
      .roundedRect(30, 60, width - 60, 380, 25)
      .fill("#38bdf8")
      .restore();

    // ===== RIGHT SIDE STRIP (like boarding pass) =====
    doc
      .roundedRect(width - 130, 60, 100, 380, 20)
      .fill("#ffffff");

    // ===== CONFIRMED LABEL =====
    doc
      .fillColor("#ffffff")
      .fontSize(14)
      .text("ADMISSION CONFIRMED TO", 60, 85);

    // ===== EVENT TITLE =====
    doc
      .fontSize(30)
      .fillColor("#fff")
      .text(data.eventTitle, 60, 108, { width: width - 210 });

    // ===== CATEGORY BADGE =====
    const badgeY = doc.y + 6;
    if (data.category && data.category !== "Other") {
      doc.roundedRect(60, badgeY, 100, 22, 8).fill("#000");
      doc.fillColor("#fff").fontSize(10).text(data.category.toUpperCase(), 68, badgeY + 6, { width: 84, align: "center" });
    }

    // ===== PASS HOLDER =====
    doc
      .fontSize(16)
      .fillColor("#fff")
      .text(`PASS HOLDER: ${data.userName}`, 60, badgeY + 34);

    // ===== DETAILS (2-column) =====
    const detailY = badgeY + 60;
    doc.fontSize(10).fillColor("#e5e7eb");

    // Left column
    doc.fillColor("#ffffffaa").text("DATE", 60, detailY);
    doc.fillColor("#fff").fontSize(12).text(new Date(data.date).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" }), 60, detailY + 14);

    doc.fontSize(10).fillColor("#ffffffaa").text("VENUE", 60, detailY + 38);
    doc.fillColor("#fff").fontSize(12).text(data.venue, 60, detailY + 52, { width: 180 });

    // Right column
    if (data.startTime) {
      doc.fontSize(10).fillColor("#ffffffaa").text("TIME", 260, detailY);
      doc.fillColor("#fff").fontSize(12).text(`${data.startTime}${data.endTime ? ' - ' + data.endTime : ''}`, 260, detailY + 14);
    }

    if (data.contactEmail) {
      doc.fontSize(10).fillColor("#ffffffaa").text("CONTACT", 260, detailY + 38);
      doc.fillColor("#fff").fontSize(11).text(data.contactEmail, 260, detailY + 52, { width: 180 });
    }

    // ===== PASS TYPE BADGE =====
    const passY = detailY + 82;
    doc.roundedRect(60, passY, 120, 28, 10).fill("#000");
    doc.fillColor("#fff").fontSize(11).text("EVENT PASS ✦", 72, passY + 8);

    // ===== QR CODE ON RIGHT STRIP =====
    if (data.qrCodeBuffer) {
      doc.image(data.qrCodeBuffer, width - 118, 100, { fit: [76, 76] });
    }

    // ===== STRIP TEXT =====
    doc
      .fillColor("#000")
      .fontSize(9)
      .text("ADMIT ONE", width - 118, 200);

    // ===== DIVIDER LINE =====
    doc.moveTo(width - 130, 60).lineTo(width - 130, 440).stroke("#e5e7eb");

    // ===== RULES SECTION (below card) =====
    if (data.rules) {
      doc.fontSize(10).fillColor("#6b7280").text("RULES & GUIDELINES", 40, 460);
      doc.fontSize(9).fillColor("#9ca3af").text(data.rules, 40, 476, { width: width - 80, lineGap: 2 });
    }

    // ===== FOOTER =====
    doc
      .fillColor("#9ca3af")
      .fontSize(9)
      .text(
        "Show this QR at entry • Valid for one person only • This ticket is non-transferable",
        0,
        height - 40,
        { align: "center" }
      );

    doc.end();
  });
};

// 🔹 FINAL CONTROLLER — sends individual QR ticket to EACH member
export const downloadTicket = async (req, res) => {
  try {
    const { id } = req.params;

    const registration = await Registration.findById(id);
    if (!registration || registration.approvalStatus !== "APPROVED") {
      return res.status(400).json({ message: "Ticket not approved or available" });
    }

    const event = await Event.findById(registration.eventId);
    if (!event) return res.status(404).json({ message: "Event not found" });

    let users = [];

    // 🔹 SOLO registration
    if (registration.userId && !registration.teamId) {
      const singleUser = await User.findById(registration.userId);
      if (singleUser) users.push(singleUser);
    }
    // 🔹 TEAM registration
    else if (registration.teamId) {
      const team = await Team.findById(registration.teamId).populate("members");
      if (team) users = team.members;
    }

    if (users.length === 0) {
      return res.status(400).json({ message: "No users associated with this registration" });
    }

    // 🔹 If ?email= is provided, send only to that specific member
    const targetEmail = req.query.email;
    if (targetEmail) {
      const targetUser = users.find(u => u.email === targetEmail);
      if (!targetUser) {
        return res.status(404).json({ message: "Member not found in this registration" });
      }
      users = [targetUser];
    }

    // 🔹 Send INDIVIDUAL ticket with UNIQUE QR to each member
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
        qrCodeBuffer: qrCodeBuffer,
      };

      const pdfBuffer = await generatePDFBuffer(data);

      await sendEmail(
        user.email,
        `Your Ticket for ${event.title} 🎟️`,
        `<h3>Hello ${user.name},</h3>
         <p>Your registration for <b>${event.title}</b> is approved!</p>
         <p><b>Date:</b> ${new Date(event.date).toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" })}${event.startTime ? ' at ' + event.startTime : ''}</p>
         <p><b>Venue:</b> ${event.venue}</p>
         ${event.category ? '<p><b>Category:</b> ' + event.category + '</p>' : ''}
         ${event.rules ? '<p><b>Rules:</b> ' + event.rules + '</p>' : ''}
         ${event.contactEmail ? '<p><b>Contact:</b> ' + event.contactEmail + '</p>' : ''}
         <p>Your personal QR ticket is attached. Show this at the entrance.</p>`,
        {
          filename: `Ticket-${event.title.replace(/\s+/g, '-')}-${user.name.replace(/\s+/g, '-')}.pdf`,
          content: pdfBuffer,
          contentType: 'application/pdf'
        }
      );
    }

    res.json({ message: `Ticket(s) generated and sent to ${users.length} participant(s) successfully!` });

  } catch (error) {
    console.error("Ticket Error:", error);
    res.status(500).json({ message: error.message });
  }
};



// // 🔹 DIRECT DOWNLOAD CONTROLLER — returns a PDF directly
// export const directDownloadTicket = async (req, res) => {
//   try {
//     const { id } = req.params;
//     const registration = await Registration.findById(id);
//     if (!registration || registration.approvalStatus !== "APPROVED") {
//       return res.status(400).json({ message: "Ticket not approved or available" });
//     }
//     const event = await Event.findById(registration.eventId);
//     if (!event) return res.status(404).json({ message: "Event not found" });
//     let users = [];
//     if (registration.userId && !registration.teamId) {
//       const singleUser = await User.findById(registration.userId);
//       if (singleUser) users.push(singleUser);
//     } else if (registration.teamId) {
//       const team = await Team.findById(registration.teamId).populate("members");
//       if (team) users = team.members;
//     }
//     if (users.length === 0) {
//       return res.status(400).json({ message: "No users associated with this registration" });
//     }
//     const targetEmail = req.query.email;
//     if (targetEmail) {
//       const targetUser = users.find(u => u.email === targetEmail);
//       if (!targetUser) {
//         return res.status(404).json({ message: "Member not found in this registration" });
//       }
//       users = [targetUser];
//     }
//     const user = users[0];
//     const qrData = `${registration._id}-${user._id}`;
//     const qrCodeBuffer = await QRCode.toBuffer(qrData);
//     const data = {
//       eventTitle: event.title,
//       userName: user.name,
//       venue: event.venue,
//       date: event.date,
//       category: event.category,
//       startTime: event.startTime,
//       endTime: event.endTime,
//       contactEmail: event.contactEmail,
//       rules: event.rules,
//       qrCodeBuffer: qrCodeBuffer,
//     };
//     const pdfBuffer = await generatePDFBuffer(data);
//     res.set({
//       'Content-Type': 'application/pdf',
//       'Content-Disposition': `attachment; filename="Ticket-${event.title.replace(/\s+/g, '-')}-${user.name.replace(/\s+/g, '-')}.pdf"`,
//     });
    
//     res.send(pdfBuffer);
//   } catch (error) {
//     console.error("Direct Download Ticket Error:", error);
//     res.status(500).json({ message: error.message });
//   }
// };
// import express from "express";
// import { downloadTicket } from "../controllers/ticketController.js";
// import { downloadTicket, directDownloadTicket } from "../controllers/ticketController.js";
// const router = express.Router();
// router.get("/download/:id", downloadTicket);
// router.get("/direct/:id", directDownloadTicket);
// export default router;