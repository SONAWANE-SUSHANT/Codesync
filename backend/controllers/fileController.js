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

// Rename File or Folder
exports.renameFile = async (req, res) => {
  try {
    const file = await File.findById(req.params.fileId);
    if (!file) return res.status(404).json({ msg: "File not found" });

    const oldName = file.fileName;
    file.fileName = req.body.fileName;
    await file.save();

    if (file.isFolder) {
      await File.updateMany(
        { projectId: file.projectId, parentFolder: oldName },
        { parentFolder: req.body.fileName }
      );
    }

    await log({
      projectId: file.projectId,
      userId: req.user.id,
      userName: req.user.name || "Someone",
      action: file.isFolder ? "renamed_folder" : "renamed_file",
      detail: `${oldName} -> ${req.body.fileName}`,
    });

    res.json(file);
  } catch {
    res.status(500).json({ msg: "Rename failed" });
  }
};

// Delete File or Folder
exports.deleteFile = async (req, res) => {
  try {
    const file = await File.findByIdAndDelete(req.params.fileId);
    if (!file) return res.status(404).json({ msg: "File not found" });

    if (file.isFolder) {
      await File.deleteMany({ projectId: file.projectId, parentFolder: file.fileName });
    }

    await log({
      projectId: file.projectId,
      userId: req.user.id,
      userName: req.user.name || "Someone",
      action: file.isFolder ? "deleted_folder" : "deleted_file",
      detail: file.fileName,
    });

    res.json({ msg: "Deleted" });
  } catch {
    res.status(500).json({ msg: "Delete failed" });
  }
};
