// import Registration from "../models/Registration.js";
// import Event from "../models/Event.js";

// export const registerForEvent = async (req, res) => {
//   try {
//     const { userId, teamId, eventId } = req.body;

//     // get event
//     const event = await Event.findById(eventId);
//     if (!event) {
//       return res.status(404).json({ message: "Event not found" });
//     }

//     let paymentStatus = "PENDING";
//     let amount = 0;
//     let approvalStatus = "PENDING";

//     // 💳 Payment logic
//     if (event.isPaid) {
//       paymentStatus = "SUCCESS"; // simulated
//       amount = event.price;
//     } else {
//       paymentStatus = "FREE";
//     }

//     // 👤 Solo vs Team logic
//     if (event.isTeamEvent) {
//       if (!teamId) {
//         return res.status(400).json({ message: "Team required for this event" });
//       }

//       approvalStatus = "PENDING"; // organizer will approve
//     } else {
//       if (!userId) {
//         return res.status(400).json({ message: "User required" });
//       }

//       approvalStatus = "APPROVED"; // auto approve
//     }

//     // create registration
//     const registration = await Registration.create({
//       userId,
//       teamId,
//       eventId,
//       paymentStatus,
//       amount,
//       approvalStatus,
//     });

//     res.status(201).json({
//       message: "Registered successfully",
//       registration,
//     });

//   } catch (error) {
//     res.status(500).json({ message: error.message });
//   }
// };

import Registration from "../models/Registration.js";
import Event from "../models/Event.js";
import generateQR from "../utils/generateQR.js";

export const registerForEvent = async (req, res) => {
  try {
    const { userId, teamId, eventId } = req.body;

    // 1. Check if event exists
    const event = await Event.findById(eventId);
    if (!event) {
      return res.status(404).json({ message: "Event not found" });
    }

    // 2. 🛡️ DUPLICATE CHECK
    // If teamId exists, check if that team is already registered.
    // If solo, check if that user is already registered.
    const query = teamId ? { teamId, eventId } : { userId, eventId, teamId: null };
    const existingRegistration = await Registration.findOne(query);
    
    if (existingRegistration) {
      return res.status(400).json({ message: "This registration already exists!" });
    }

    let paymentStatus = "PENDING";
    let amount = event.price || 0;
    let approvalStatus = "PENDING";

    // 3. 💳 Payment Logic — PENDING until actually paid via payment flow
    if (event.price > 0) {
      paymentStatus = "PENDING"; // Will be set to SUCCESS after payment
    } else {
      paymentStatus = "FREE";
    }

    // 4. 👤 Solo vs Team Logic
    // 4. 👤 Solo vs Team Logic
    if (event.isTeamEvent) {
      if (!teamId) {
        return res.status(400).json({ message: "Team ID is required for team events" });
      }
      approvalStatus = "PENDING"; 
    } else {
      if (!userId) {
        return res.status(400).json({ message: "User ID is required for solo events" });
      }
      // 🔹 CHANGE THIS LINE FROM "APPROVED" TO "PENDING"
      approvalStatus = "PENDING"; 
    }

    // 5. Create the document
    const registration = await Registration.create({
      userId, // For teams, this is the Leader's ID
      teamId: teamId || null,
      eventId,
      paymentStatus,
      amount,
      approvalStatus,
    });

    res.status(201).json({
      message: "Registration successful!",
      registration,
    });

  } catch (error) {
    res.status(500).json({ message: "Server Error: " + error.message });
  }
};

export const getAllRegistrations = async (req, res) => {
  try {
    // 🔹 Ensure we populate all fields, but handle nulls safely
    const registrations = await Registration.find()
      .populate("eventId", "title teamSize") // Get event title and size
      .populate("userId", "name email")     // Get user name and email
      .populate("teamId", "teamName");      // Get team name (if it exists)

    res.status(200).json(registrations || []); 
  } catch (error) {
    console.error("Error in getAllRegistrations:", error);
    res.status(500).json({ message: "Backend Error: " + error.message });
  }
};


// 🔹 APPROVE REGISTRATION (Admin Action)
export const approveRegistration = async (req, res) => {
  try {
    const { id } = req.params;

    const registration = await Registration.findById(id);
    if (!registration) {
      return res.status(404).json({ message: "Registration not found" });
    }

    // Generate unique QR data and QR code
    const uniqueData = `${registration._id}-${Date.now()}`;
    const qrCode = await generateQR(uniqueData);

    // Update status to Approved and store QR code
    registration.approvalStatus = "APPROVED";
    registration.qrCode = qrCode;
    
    // Save the change to MongoDB
    await registration.save();

    res.status(200).json({ 
      message: "Registration approved successfully!", 
      registration 
    });
  } catch (error) {
    res.status(500).json({ message: "Error approving registration: " + error.message });
  }
};