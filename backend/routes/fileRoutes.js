const router = require("express").Router();
const { createFile, getFiles, updateFile, renameFile, deleteFile } = require("../controllers/fileController");
const auth = require("../middleware/authMiddleware");
const File = require("../models/File");

// Create file
router.post("/", auth, createFile);

// Create folder
router.post("/folder", auth, async (req, res) => {
  try {
    const { projectId, folderName } = req.body;
    const folder = await File.create({ projectId, fileName: folderName, isFolder: true, content: "" });
    res.json(folder);
  } catch {
    res.status(500).json({ msg: "Folder creation failed" });
  }
});

// Get files
router.get("/:projectId", auth, getFiles);

// Update content
router.put("/:fileId", auth, updateFile);

// Rename
router.patch("/:fileId/rename", auth, renameFile);

// Delete
router.delete("/:fileId", auth, deleteFile);

module.exports = router;
