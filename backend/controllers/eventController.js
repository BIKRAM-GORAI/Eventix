import Event from "../models/Event.js";

// 🔹 CREATE EVENT (Organizer)
export const createEvent = async (req, res) => {
  try {
    const {
      title,
      description,
      date,
      venue,
      price,
      isPaid,
      maxParticipants,
      isTeamEvent,
      teamSize,
      createdBy,
      clubId,
      category,
      startTime,
      endTime,
      contactEmail,
      contactPhone,
      rules,
    } = req.body;

    if (!title || !description || !date || !venue || !createdBy || !clubId) {
      return res.status(400).json({
        message: "Please fill required fields, including creator ID and club ID",
      });
    }

    const finalPrice = isPaid ? Number(price) : 0;
    const finalTeamSize = isTeamEvent ? Number(teamSize) : 1;
    const finalMaxParticipants = maxParticipants ? Number(maxParticipants) : 100;

    const event = await Event.create({
      title,
      description,
      category: category || "Other",
      date,
      startTime,
      endTime,
      venue,
      price: finalPrice,
      isPaid: !!isPaid,
      maxParticipants: finalMaxParticipants,
      isTeamEvent: !!isTeamEvent,
      teamSize: finalTeamSize,
      contactEmail,
      contactPhone,
      rules,
      createdBy,
      clubId,
    });

    res.status(201).json({
      message: "Event created successfully",
      event,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// 🔹 GET ALL EVENTS (Students)
export const getAllEvents = async (req, res) => {
  try {
    const events = await Event.find().populate("createdBy", "name email clubName clubId");
    res.status(200).json(events);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// 🔹 GET EVENTS BY CLUB ID (Organizer Dashboard)
export const getEventsByClub = async (req, res) => {
  try {
    const { clubId } = req.params;
    const events = await Event.find({ clubId }).populate("createdBy", "name email clubName");
    res.status(200).json(events);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};