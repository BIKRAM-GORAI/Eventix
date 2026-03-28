import Registration from "../models/Registration.js";
import Attendance from "../models/Attendance.js";
import Event from "../models/Event.js";
import User from "../models/User.js";
import Team from "../models/Team.js";

export const scanQR = async (req, res) => {
  try {
    const { registrationId } = req.body;

    if (!registrationId) {
      return res.status(400).json({ message: "No QR data provided" });
    }

    // 🔹 Parse QR data — "registrationId" (solo) or "registrationId-userId" (team)
    let regId = registrationId;
    let scannedUserId = null;

    if (registrationId.includes("-")) {
      const parts = registrationId.split("-");
      regId = parts[0];
      scannedUserId = parts[1];
    }

    // 1. Find the registration with event details
    const registration = await Registration.findById(regId)
      .populate("eventId");

    if (!registration) {
      return res.status(404).json({ message: "Invalid Ticket: Not found in database" });
    }

    // 2. Check if the admin has approved this registration
    if (registration.approvalStatus !== "APPROVED") {
      return res.status(400).json({
        message: "Access Denied: Registration is still PENDING approval"
      });
    }

    // 3. 🔹 DATE VALIDATION — only allow scan on the event day
    const eventDate = new Date(registration.eventId.date);
    const today = new Date();

    // Compare year, month, and day only (ignore time)
    const eventDay = new Date(eventDate.getFullYear(), eventDate.getMonth(), eventDate.getDate());
    const todayDay = new Date(today.getFullYear(), today.getMonth(), today.getDate());

    if (eventDay.getTime() !== todayDay.getTime()) {
      const formattedDate = eventDate.toLocaleDateString("en-IN", {
        day: "numeric", month: "short", year: "numeric"
      });

      if (todayDay < eventDay) {
        return res.status(400).json({
          message: `Too Early! This ticket is valid on ${formattedDate}. The event hasn't started yet.`
        });
      } else {
        return res.status(400).json({
          message: `Expired! This ticket was valid on ${formattedDate}. The event has already passed.`
        });
      }
    }

    // 4. Determine the participant
    let participant = null;

    if (scannedUserId) {
      participant = await User.findById(scannedUserId);
    } else if (registration.userId) {
      participant = await User.findById(registration.userId);
    }

    const participantName = participant ? participant.name : "Unknown Participant";
    const participantEmail = participant ? participant.email : "";
    const participantCollege = participant ? participant.collegeName : "";
    const participantId = participant ? participant._id : registration.userId;

    // 5. Check if already checked in
    const query = scannedUserId
      ? { registrationId: regId, userId: scannedUserId }
      : { registrationId: regId };

    const existingAttendance = await Attendance.findOne(query);
    if (existingAttendance) {
      return res.status(400).json({
        message: "Already Scanned! This ticket was used.",
        participant: participantName,
        time: existingAttendance.scannedAt
      });
    }

    // 6. Mark Attendance
    const newAttendance = new Attendance({
      registrationId: regId,
      eventId: registration.eventId._id,
      userId: participantId,
      isPresent: true,
      scannedAt: new Date()
    });

    await newAttendance.save();

    // 7. Success Response
    res.status(200).json({
      message: "Access Granted",
      participant: participantName,
      email: participantEmail,
      college: participantCollege,
      event: registration.eventId.title,
      scannedAt: newAttendance.scannedAt
    });

  } catch (error) {
    res.status(500).json({ message: "Server Error: " + error.message });
  }
};


// 🔹 ATTENDANCE ANALYTICS — event-wise attendance with participants grouped by team
export const getAttendanceByEvent = async (req, res) => {
  try {
    const { eventId } = req.params;

    // Get the event details
    const event = await Event.findById(eventId);
    if (!event) return res.status(404).json({ message: "Event not found" });

    // Get all attendance records for this event
    const records = await Attendance.find({ eventId })
      .populate("userId", "name email collegeName phone")
      .populate({
        path: "registrationId",
        populate: {
          path: "teamId",
          populate: { path: "members", select: "name email" }
        }
      })
      .sort({ scannedAt: 1 });

    // Get total registrations for this event (for stats)
    const totalRegistrations = await Registration.countDocuments({
      eventId, approvalStatus: "APPROVED"
    });

    // Group: solo attendees vs team attendees
    const soloAttendees = [];
    const teamGroups = {};

    for (const record of records) {
      const reg = record.registrationId;

      if (reg && reg.teamId) {
        // Team registration — group by team
        const teamId = reg.teamId._id.toString();
        if (!teamGroups[teamId]) {
          teamGroups[teamId] = {
            teamName: reg.teamId.teamName || "Unnamed Team",
            totalMembers: reg.teamId.members ? reg.teamId.members.length : 0,
            checkedIn: []
          };
        }
        teamGroups[teamId].checkedIn.push({
          name: record.userId ? record.userId.name : "Unknown",
          email: record.userId ? record.userId.email : "",
          college: record.userId ? record.userId.collegeName : "",
          scannedAt: record.scannedAt
        });
      } else {
        // Solo registration
        soloAttendees.push({
          name: record.userId ? record.userId.name : "Unknown",
          email: record.userId ? record.userId.email : "",
          college: record.userId ? record.userId.collegeName : "",
          scannedAt: record.scannedAt
        });
      }
    }

    res.json({
      event: {
        _id: event._id,
        title: event.title,
        date: event.date,
        venue: event.venue,
        startTime: event.startTime,
        category: event.category,
        isTeamEvent: event.isTeamEvent,
        teamSize: event.teamSize
      },
      stats: {
        totalRegistrations,
        totalCheckedIn: records.length,
        attendanceRate: totalRegistrations > 0
          ? Math.round((records.length / totalRegistrations) * 100)
          : 0
      },
      soloAttendees,
      teamGroups: Object.values(teamGroups)
    });

  } catch (error) {
    res.status(500).json({ message: "Server Error: " + error.message });
  }
};


// 🔹 GET ALL EVENTS WITH ATTENDANCE SUMMARY — for the analytics overview
export const getAttendanceSummary = async (req, res) => {
  try {
    const events = await Event.find().sort({ date: -1 });

    const summary = await Promise.all(events.map(async (event) => {
      const totalApproved = await Registration.countDocuments({
        eventId: event._id, approvalStatus: "APPROVED"
      });
      const totalCheckedIn = await Attendance.countDocuments({ eventId: event._id });

      return {
        _id: event._id,
        title: event.title,
        date: event.date,
        venue: event.venue,
        category: event.category,
        isTeamEvent: event.isTeamEvent,
        startTime: event.startTime,
        totalApproved,
        totalCheckedIn,
        attendanceRate: totalApproved > 0
          ? Math.round((totalCheckedIn / totalApproved) * 100)
          : 0
      };
    }));

    res.json(summary);
  } catch (error) {
    res.status(500).json({ message: "Server Error: " + error.message });
  }
};