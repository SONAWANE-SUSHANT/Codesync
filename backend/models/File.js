const mongoose = require("mongoose");

const fileSchema = new mongoose.Schema({
  projectId: String,
  fileName: String,
  content: {
    type: String,
    default: "",
  },

  // 🔥 NEW
  isFolder: {
    type: Boolean,
    default: false,
  },

  parentFolder: {
    type: String,
    default: "root",
  },
});

module.exports = mongoose.model("File", fileSchema);