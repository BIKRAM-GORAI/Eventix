import mongoose from "mongoose";
import dns from "dns";

// Override Node's DNS servers to Google & Cloudflare DNS (8.8.8.8 & 1.1.1.1)
// Fixes 'querySrv ECONNREFUSED' caused by Windows local ISP/router DNS blocking SRV lookups
try {
  dns.setServers(["8.8.8.8", "1.1.1.1"]);
} catch (err) {
  console.warn("Could not set custom DNS servers:", err.message);
}

const connectDB = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGO_URI);

    console.log(`MongoDB Connected: ${conn.connection.host}`);
  } catch (error) {
    console.error("❌ DB Connection Failed:", error.message);
    if (error.message.includes("ECONNREFUSED") || error.message.includes("querySrv")) {
      console.error("\n💡 Troubleshooting MongoDB SRV Connection:");
      console.error("1️⃣ Ensure your IP address is whitelisted on MongoDB Atlas (Network Access -> 0.0.0.0/0).");
      console.error("2️⃣ Ensure your MongoDB Atlas cluster is active on https://cloud.mongodb.com.\n");
    }
    process.exit(1);
  }
};

export default connectDB;