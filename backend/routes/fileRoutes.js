const router = require("express").Router();

const {
  createFile,
  getFiles,
  updateFile,
} = require("../controllers/fileController");

const auth = require("../middleware/authMiddleware");
const File = require("../models/File");

// ================= CREATE FILE =================
router.post("/", auth, createFile);

// ================= CREATE FOLDER =================
router.post("/folder", auth, async (req, res) => {
  try {
    const { projectId, folderName } = req.body;

    const folder = await File.create({
      projectId,
      fileName: folderName,
      isFolder: true,
      content: "",
    });

    res.json(folder);
  } catch (err) {
    res.status(500).json({ msg: "Folder creation failed" });
  }
});

// ================= GET FILES =================
router.get("/:projectId", auth, getFiles);

// ================= UPDATE FILE =================
router.put("/:fileId", auth, updateFile);

module.exports = router;