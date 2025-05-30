const mongoose = require("mongoose");

const userSchema = new mongoose.Schema({
  username: {
    type: String,
    required: true,
  },
  password: {
    type: String,
    required: true,
  },
  roles: {
    type: [String],
    default: ["Employee"],
  },
  active: {
    type: Boolean,
    default: true,
  },
  avatar: {
    type: String,
    default: "http://localhost:3500/uploads/AVATAR.png",
  },
});

module.exports = mongoose.model("User", userSchema);
