import Event from "../models/Event.js";


// // 🔹 CREATE EVENT (Organizer)
// export const createEvent = async (req, res) => {
//   try {
//     const {
//       title,
//       description,
//       date,
//       venue,
//       price,
//       isPaid,
//       maxParticipants,
//       isTeamEvent,
//       teamSize,
//     } = req.body;

//     // basic validation
//     if (!title || !description || !date || !venue) {
//       return res.status(400).json({ message: "Please fill required fields" });
//     }

//     // simple rules
//     let finalPrice = isPaid ? price : 0;
//     let finalTeamSize = isTeamEvent ? teamSize : 1;

//     const event = await Event.create({
//       title,
//       description,
//       date,
//       venue,
//       price: finalPrice,
//       isPaid,
//       maxParticipants,
//       isTeamEvent,
//       teamSize: finalTeamSize,
//       createdBy: req.body.userId, // temporary (we'll improve later)
//     });

//     res.status(201).json({
//       message: "Event created successfully",
//       event,
//     });

//   } catch (error) {
//     res.status(500).json({ message: error.message });
//   }
// };
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
      createdBy, // 🔹 Capture the ID sent from frontend
    } = req.body;

    // 1. Basic validation
    if (!title || !description || !date || !venue || !createdBy) {
      return res.status(400).json({ 
        message: "Please fill required fields, including creator ID" 
      });
    }

    // 2. Data Sanitization
    // Ensure numbers are numbers and booleans are booleans
    const finalPrice = isPaid ? Number(price) : 0;
    const finalTeamSize = isTeamEvent ? Number(teamSize) : 1;
    const finalMaxParticipants = maxParticipants ? Number(maxParticipants) : 100;

    // 3. Create Event
    const event = await Event.create({
      title,
      description,
      date,
      venue,
      price: finalPrice,
      isPaid: !!isPaid, // Force boolean
      maxParticipants: finalMaxParticipants,
      isTeamEvent: !!isTeamEvent, // Force boolean
      teamSize: finalTeamSize,
      createdBy: createdBy, // 🔹 Match the field name from your Schema
    });

    res.status(201).json({
      message: "Event created successfully",
      event,
    });

  } catch (error) {
    // If it's a validation error from Mongoose, it will show up here
    res.status(500).json({ message: error.message });
  }
};


// 🔹 GET ALL EVENTS (Students)
export const getAllEvents = async (req, res) => {
  try {
    const events = await Event.find().populate("createdBy", "name email");

    res.status(200).json(events);

  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};