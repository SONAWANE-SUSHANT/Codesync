const File = require("../models/File");
const { log } = require("./activityController");

// Create File
exports.createFile = async (req, res) => {
  try {
    const file = await File.create({
      projectId: req.body.projectId,
      fileName: req.body.fileName,
      parentFolder: req.body.parentFolder || "root",
      content: "",
    });

    await log({
      projectId: req.body.projectId,
      userId: req.user.id,
      userName: req.user.name || "Someone",
      action: "created_file",
      detail: req.body.fileName,
    });

    res.json(file);
  } catch (err) {
    res.status(500).json({ msg: "File creation failed", error: err });
  }
};

// Get Files of a Project
exports.getFiles = async (req, res) => {
  try {
    const files = await File.find({ projectId: req.params.projectId });
    res.json(files);
  } catch {
    res.status(500).json({ msg: "Fetch failed" });
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

    await log({
      projectId: file.projectId,
      userId: req.user.id,
      userName: req.user.name || "Someone",
      action: "saved",
      detail: file.fileName,
    });

    res.json(file);
  } catch {
    res.status(500).json({ msg: "Update failed" });
  }
};

// Rename File
exports.renameFile = async (req, res) => {
  try {
    const file = await File.findByIdAndUpdate(
      req.params.fileId,
      { fileName: req.body.fileName },
      { new: true }
    );

    await log({
      projectId: file.projectId,
      userId: req.user.id,
      userName: req.user.name || "Someone",
      action: "renamed_file",
      detail: `→ ${req.body.fileName}`,
    });

    res.json(file);
  } catch {
    res.status(500).json({ msg: "Rename failed" });
  }
};

// Delete File
exports.deleteFile = async (req, res) => {
  try {
    const file = await File.findByIdAndDelete(req.params.fileId);
    if (!file) return res.status(404).json({ msg: "File not found" });

    await log({
      projectId: file.projectId,
      userId: req.user.id,
      userName: req.user.name || "Someone",
      action: "deleted_file",
      detail: file.fileName,
    });

    res.json({ msg: "Deleted" });
  } catch {
    res.status(500).json({ msg: "Delete failed" });
  }
};