import Team from "../models/Team.js";
import Event from "../models/Event.js";

// 🔹 CREATE TEAM
export const createTeam = async (req, res) => {
  try {
    const { teamName, leaderId, eventId } = req.body;

    if (!teamName || !leaderId || !eventId) {
      return res.status(400).json({ message: "All fields required" });
    }

    //new
    const existingTeam = await Team.findOne({
      eventId,
      members: leaderId,
    });

    if (existingTeam) {
      return res
        .status(400)
        .json({ message: "Already in a team for this event" });
    }

    // check event
    const event = await Event.findById(eventId);
    if (!event || !event.isTeamEvent) {
      return res.status(400).json({ message: "Invalid team event" });
    }

    // generate simple team code
    const teamCode = Math.random().toString(36).substring(2, 8);

    const team = await Team.create({
      teamName,
      teamCode,
      leaderId,
      members: [leaderId], // ✅ leader included
      eventId,
    });

    res.status(201).json({
      message: "Team created",
      team,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};



export const joinTeam = async (req, res) => {
  try {
    const { teamCode, userId } = req.body;

    const team = await Team.findOne({ teamCode });
    if (!team) {
      return res.status(404).json({ message: "Team not found" });
    }

    const event = await Event.findById(team.eventId);

    // 🔒 check if user already in another team for same event
    const alreadyInTeam = await Team.findOne({
      eventId: team.eventId,
      members: userId,
    });

    if (alreadyInTeam) {
      return res.status(400).json({
        message: "Already in a team for this event",
      });
    }

    // check team size limit
    if (team.members.length >= event.teamSize) {
      return res.status(400).json({ message: "Team is full" });
    }

    // prevent duplicate join (same team)
    if (team.members.includes(userId)) {
      return res.status(400).json({ message: "Already in this team" });
    }

    team.members.push(userId);
    await team.save();

    res.status(200).json({
      message: "Joined team successfully",
      team,
    });

  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
