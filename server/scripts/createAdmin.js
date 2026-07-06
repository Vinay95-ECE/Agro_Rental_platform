/**
 * Run this ONCE to create the Admin account:
 *   node server/scripts/createAdmin.js
 */

require("dotenv").config({ path: require("path").join(__dirname, "../.env") });
const mongoose = require("mongoose");
const User     = require("../models/User");

const ADMIN_EMAIL    = "admin@agrirent.com";
const ADMIN_PASSWORD = "Admin@1234";  // Plain text — model pre-save hook will hash it
const ADMIN_PHONE    = "9000000000";

(async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log("Connected to MongoDB:", process.env.MONGO_URI);

    // Remove old admin if exists
    await User.deleteOne({ email: ADMIN_EMAIL });

    // DO NOT manually hash — User model pre-save hook handles hashing
    const admin = await User.create({
      name:        "Super Admin",
      email:       ADMIN_EMAIL,
      password:    ADMIN_PASSWORD,
      phone:       ADMIN_PHONE,
      role:        "Admin",
      kycStatus:   "Approved",
      isVerified:  true,
      isActive:    true,
      isSuspended: false,
      xp:    0,
      coins: 0,
      badge: "Beginner Farmer",
      location: { type: "Point", coordinates: [77.2090, 28.6139] }
    });

    console.log("\nAdmin user created!");
    console.log("  Email   :", ADMIN_EMAIL);
    console.log("  Password:", ADMIN_PASSWORD);
    console.log("  Role    :", admin.role);
    console.log("  ID      :", admin._id);
  } catch (err) {
    console.error("Error creating admin:", err.message);
  } finally {
    await mongoose.disconnect();
    process.exit(0);
  }
})();
