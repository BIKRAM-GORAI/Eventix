import { v2 as cloudinary } from "cloudinary";
import dotenv from "dotenv";

dotenv.config();

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

async function run() {
  try {
    const result = await cloudinary.uploader.upload("test.jpg", { folder: "event-users" });
    console.log("Success:", result);
  } catch (err) {
    console.log("Error type:", typeof err);
    console.log("Is error an Array?", Array.isArray(err));
    console.log("Error keys:", Object.keys(err));
    console.log("Error stringified:", JSON.stringify(err, null, 2));
    console.log("Raw object:", err);
  }
}

run();
