import express from "express";
import { downloadTicket } from "../controllers/ticketController.js";
// import { downloadTicket, directDownloadTicket } from "../controllers/ticketController.js";
const router = express.Router();

router.get("/download/:id", downloadTicket);
// router.get("/direct/:id", directDownloadTicket);

export default router;