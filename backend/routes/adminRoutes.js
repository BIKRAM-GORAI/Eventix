import express from "express";
import {
  getPendingOrganizers,
  getApprovedOrganizers,
  approveOrganizer,
  rejectOrganizer,
} from "../controllers/adminController.js";

const router = express.Router();

// Get pending organizer signups
router.get("/pending-organizers", getPendingOrganizers);

// Get all approved organizers
router.get("/approved-organizers", getApprovedOrganizers);

// Approve an organizer
router.put("/approve-organizer/:id", approveOrganizer);

// Reject an organizer
router.delete("/reject-organizer/:id", rejectOrganizer);

export default router;
