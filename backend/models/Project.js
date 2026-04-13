const mongoose = require("mongoose");

const projectSchema = new mongoose.Schema({
  name: String,

  owner: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
  },

  members: [
    {
      user: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
      // "owner" | "editor" | "viewer"
      role: { type: String, default: "editor" },
    },
  ],

  isPublic: { type: Boolean, default: false },
}, { timestamps: true });

module.exports = mongoose.model("Project", projectSchema);