const mongoose = require("mongoose");

const projectSchema = new mongoose.Schema({
  name: String,

  owner: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
  },

  members: [
    {
      user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
      },
      role: {
        type: String,
        default: "member", // owner / member
      },
    },
  ],

  isPublic: {
    type: Boolean,
    default: false,
  },
}, { timestamps: true });

module.exports = mongoose.model("Project", projectSchema);
