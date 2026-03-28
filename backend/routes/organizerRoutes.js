import express from "express";
import {
  approveRegistration,
  rejectRegistration,
} from "../controllers/organizerController.js";

import { getDashboardStats } from "../controllers/organizerController.js";

const router = express.Router();

// approve registration
router.post("/approve/:id", approveRegistration);

// reject registration
router.post("/reject/:id", rejectRegistration);
router.get("/stats/:eventId", getDashboardStats);

export default router;