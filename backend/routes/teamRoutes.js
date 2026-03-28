import express from "express";
import { createTeam, joinTeam } from "../controllers/teamController.js";
import Team from "../models/Team.js";
const router = express.Router();

// create team
router.post("/create", createTeam);

// join team
router.post("/join", joinTeam);

router.get("/user/:userId", async (req, res) => {
  try {
    const teams = await Team.find({
      members: req.params.userId,
    }).populate("eventId");

    res.json(teams);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.get("/:id", async (req, res) => {
  try {
    const team = await Team.findById(req.params.id);
    res.json(team);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

export default router;