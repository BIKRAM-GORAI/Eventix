import mongoose from "mongoose";

const eventSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
    },

    description: {
      type: String,
      required: true,
    },

    category: {
      type: String,
      enum: ["Hackathon", "Workshop", "Cultural", "Sports", "Seminar", "Competition", "Other"],
      default: "Other",
    },

    date: {
      type: Date,
      required: true,
    },

    startTime: {
      type: String, // e.g. "10:00 AM"
    },

    endTime: {
      type: String, // e.g. "05:00 PM"
    },

    venue: {
      type: String,
      required: true,
    },

    price: {
      type: Number,
      default: 0,
    },

    isPaid: {
      type: Boolean,
      default: false,
    },

    maxParticipants: {
      type: Number,
    },

    isTeamEvent: {
      type: Boolean,
      default: false,
    },

    teamSize: {
      type: Number,
      default: 1,
    },

    contactEmail: {
      type: String,
    },

    contactPhone: {
      type: String,
    },

    rules: {
      type: String,
    },

    isConcluded: {
      type: Boolean,
      default: false,
    },

    concludedAt: {
      type: Date,
    },

    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
  },
  { timestamps: true }
);

const Event = mongoose.model("Event", eventSchema);

export default Event;