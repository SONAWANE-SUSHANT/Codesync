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

// Rename File or Folder
exports.renameFile = async (req, res) => {
  try {
    const { fileName } = req.body;
    if (!fileName) return res.status(400).json({ msg: "New name required" });

    const file = await File.findByIdAndUpdate(
      req.params.fileId,
      { fileName },
      { new: true }
    );
    res.json(file);
  } catch (error) {
    res.status(500).json({ msg: "Rename failed", error });
  }
};

// Delete File or Folder
exports.deleteFile = async (req, res) => {
  try {
    const file = await File.findById(req.params.fileId);
    if (!file) return res.status(404).json({ msg: "File not found" });

    // If deleting a folder, also delete all files inside it
    if (file.isFolder) {
      await File.deleteMany({ projectId: file.projectId, parentFolder: file.fileName });
    }

    await File.findByIdAndDelete(req.params.fileId);
    res.json({ msg: "Deleted successfully" });
  } catch (error) {
    res.status(500).json({ msg: "Delete failed", error });
  }
};