const mongoose = require("mongoose");

const activitySchema = new mongoose.Schema({
  projectId: { type: mongoose.Schema.Types.ObjectId, ref: "Project", required: true },
  userId:    { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  userName:  { type: String, default: "Unknown" },
  action:    { type: String, required: true },  // "saved", "committed", "invited", "created_file", etc.
  detail:    { type: String, default: "" },      // e.g. file name, commit message
  createdAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model("Activity", activitySchema);