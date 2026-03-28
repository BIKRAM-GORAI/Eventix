import express from "express";
import { createEvent, getAllEvents } from "../controllers/eventController.js";
import Event from "../models/Event.js";
import Registration from "../models/Registration.js";
import Team from "../models/Team.js";
import User from "../models/User.js";
import sendEmail from "../utils/sendEmail.js";

const router = express.Router();

// create event (organizer)
router.post("/create", createEvent);

// get all events (students)
router.get("/", getAllEvents);

// get single event by ID
router.get("/:id", async (req, res) => {
  try {
    const event = await Event.findById(req.params.id).populate("createdBy", "name email");
    if (!event) {
      return res.status(404).json({ message: "Event not found" });
    }
    res.json(event);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// 🔹 UPDATE event details
router.put("/:id", async (req, res) => {
  try {
    const event = await Event.findById(req.params.id);
    if (!event) {
      return res.status(404).json({ message: "Event not found" });
    }

    const allowedFields = [
      "title", "description", "category", "date", "startTime", "endTime",
      "venue", "price", "isPaid", "maxParticipants", "isTeamEvent",
      "teamSize", "contactEmail", "contactPhone", "rules"
    ];

    allowedFields.forEach(field => {
      if (req.body[field] !== undefined) {
        event[field] = req.body[field];
      }
    });

    await event.save();
    res.json({ message: "Event updated successfully!", event });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// 🔹 GET all participants for an event (solo + team members)
router.get("/:id/participants", async (req, res) => {
  try {
    const registrations = await Registration.find({
      eventId: req.params.id,
      approvalStatus: "APPROVED"
    })
      .populate("userId", "name email collegeName")
      .populate({
        path: "teamId",
        populate: { path: "members", select: "name email collegeName" }
      });

    const soloParticipants = [];
    const teams = [];

    for (const reg of registrations) {
      if (reg.teamId && reg.teamId.members) {
        teams.push({
          registrationId: reg._id,
          teamName: reg.teamId.teamName,
          teamCode: reg.teamId.teamCode,
          members: reg.teamId.members.map(m => ({
            _id: m._id,
            name: m.name,
            email: m.email,
            college: m.collegeName
          }))
        });
      } else if (reg.userId) {
        soloParticipants.push({
          registrationId: reg._id,
          _id: reg.userId._id,
          name: reg.userId.name,
          email: reg.userId.email,
          college: reg.userId.collegeName
        });
      }
    }

    res.json({ soloParticipants, teams });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// 🔹 SEND EMAIL to participants of an event
router.post("/:id/notify", async (req, res) => {
  try {
    const { subject, body, targetEmails } = req.body;

    if (!subject || !body) {
      return res.status(400).json({ message: "Subject and body are required" });
    }

    let emails = [];

    if (targetEmails && targetEmails.length > 0) {
      // Send to specific emails
      emails = targetEmails;
    } else {
      // Send to ALL participants
      const registrations = await Registration.find({
        eventId: req.params.id,
        approvalStatus: "APPROVED"
      })
        .populate("userId", "email")
        .populate({
          path: "teamId",
          populate: { path: "members", select: "email" }
        });

      const emailSet = new Set();
      for (const reg of registrations) {
        if (reg.teamId && reg.teamId.members) {
          reg.teamId.members.forEach(m => emailSet.add(m.email));
        } else if (reg.userId) {
          emailSet.add(reg.userId.email);
        }
      }
      emails = [...emailSet];
    }

    if (emails.length === 0) {
      return res.status(400).json({ message: "No participants found for this event" });
    }

    // Send emails
    let sent = 0;
    for (const email of emails) {
      try {
        await sendEmail(email, subject, body);
        sent++;
      } catch (err) {
        console.error(`Failed to send to ${email}:`, err.message);
      }
    }

    res.json({ message: `Email sent to ${sent}/${emails.length} participant(s)` });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// 🔹 CONCLUDE an event
router.put("/:id/conclude", async (req, res) => {
  try {
    const event = await Event.findById(req.params.id);
    if (!event) {
      return res.status(404).json({ message: "Event not found" });
    }

    if (event.isConcluded) {
      return res.status(400).json({ message: "Event is already concluded" });
    }

    event.isConcluded = true;
    event.concludedAt = new Date();
    await event.save();

    res.json({ message: "Event concluded successfully!", event });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// 🔹 REOPEN a concluded event (undo conclude)
router.put("/:id/reopen", async (req, res) => {
  try {
    const event = await Event.findById(req.params.id);
    if (!event) {
      return res.status(404).json({ message: "Event not found" });
    }

    if (!event.isConcluded) {
      return res.status(400).json({ message: "Event is not concluded" });
    }

    event.isConcluded = false;
    event.concludedAt = undefined;
    await event.save();

    res.json({ message: "Event reopened successfully!", event });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

export default router;