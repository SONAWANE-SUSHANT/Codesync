const File = require("../models/File");

// Create File
exports.createFile = async (req, res) => {
  try {
    const file = await File.create({
      projectId: req.body.projectId,
      fileName: req.body.fileName,
      parentFolder: req.body.parentFolder || "root",
      content: "",
    });
    res.json(file);
  } catch (error) {
    res.status(500).json({ msg: "File creation failed", error });
  }
};

// Get Files of a Project
exports.getFiles = async (req, res) => {
  try {
    const files = await File.find({ projectId: req.params.projectId });
    res.json(files);
  } catch (error) {
    res.status(500).json({ msg: "Fetch failed", error });
  }
};

// Update File Content
exports.updateFile = async (req, res) => {
  try {
    const file = await File.findByIdAndUpdate(
      req.params.fileId,
      { content: req.body.content },
      { new: true }
    );
    res.json(file);
  } catch (error) {
    res.status(500).json({ msg: "Update failed", error });
  }
};