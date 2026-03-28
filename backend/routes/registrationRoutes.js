// import express from "express";
// import { registerForEvent } from "../controllers/registrationController.js";
// import Registration from "../models/Registration.js";



// const router = express.Router();

// // register for event
// router.post("/register", registerForEvent);
// router.get("/:id", async (req, res) => {
//   try {
//     const registration = await Registration.findById(req.params.id);

//     if (!registration) {
//       return res.status(404).json({ message: "Not found" });
//     }

//     res.json(registration);
//   } catch (error) {
//     res.status(500).json({ message: error.message });
//   }
// });


// router.get("/user/:userId", async (req, res) => {
//   try {
//     const userId = req.params.userId;

//     // 🔹 solo registrations
//     const soloRegs = await Registration.find({ userId })
//       .populate("eventId");

//     // 🔹 team registrations (where user is a member)
//     const teamRegs = await Registration.find()
//       .populate({
//         path: "teamId",
//         match: { members: userId }, // 🔥 filter here
//       })
//       .populate("eventId");

//     // filter only valid team regs
//     const validTeamRegs = teamRegs.filter(reg => reg.teamId !== null);

//     // merge both
//     const allRegs = [...soloRegs, ...validTeamRegs];

//     res.json(allRegs);

//   } catch (error) {
//     res.status(500).json({ message: error.message });
//   }
// });


// router.get("/all", async (req, res) => {
//     try {
//         const registrations = await Registration.find()
//             .populate("eventId")
//             .populate("userId")
//             .populate("teamId");
//         res.json(registrations);
//     } catch (error) {
//         res.status(500).json({ message: error.message });
//     }
// });

// export default router;


import express from "express";
import { 
  registerForEvent, 
  approveRegistration 
} from "../controllers/registrationController.js";
import Registration from "../models/Registration.js";

const router = express.Router();

// 1. Register (Student)
router.post("/register", registerForEvent);

// 2. Get All (Admin) - MUST be above /:id
router.get("/all", async (req, res) => {
  try {
    const registrations = await Registration.find()
      .populate("eventId")
      .populate("userId")
      .populate("teamId");
    res.json(registrations);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// 3. Get User's Specific Events (Student Dashboard)
router.get("/user/:userId", async (req, res) => {
  try {
    const userId = req.params.userId;

    // Solo registrations ONLY (teamId is null)
    const soloRegs = await Registration.find({ userId, teamId: null })
      .populate("eventId");

    // Team registrations — populate team with member details
    const teamRegs = await Registration.find({ teamId: { $ne: null } })
      .populate("eventId")
      .populate({
        path: "teamId",
        populate: { path: "members", select: "name email" }
      });

    // Filter: only keep team regs where this user is actually a member
    const validTeamRegs = teamRegs.filter(reg =>
      reg.teamId &&
      reg.teamId.members &&
      reg.teamId.members.some(m => m._id.toString() === userId)
    );

    // Deduplicate by registration _id
    const seen = new Set();
    const allRegs = [...soloRegs, ...validTeamRegs].filter(reg => {
      const id = reg._id.toString();
      if (seen.has(id)) return false;
      seen.add(id);
      return true;
    });

    res.json(allRegs);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// 4. Approve Registration (Admin Action)
router.put("/approve/:id", approveRegistration);

// 5. Get Single Registration (Ticket View) - Keep at the bottom
router.get("/:id", async (req, res) => {
  try {
    const registration = await Registration.findById(req.params.id)
      .populate("eventId")
      .populate("userId")
      .populate("teamId");

    if (!registration) return res.status(404).json({ message: "Not found" });
    res.json(registration);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

export default router;