const Commit = require("../models/Commit");

// Create Commit
exports.createCommit = async (req, res) => {
  try {
    const commit = await Commit.create({
      projectId: req.body.projectId,
      message: req.body.message,
      changes: req.body.changes,
      createdBy: req.user.id,
    });

    res.json(commit);
  } catch (error) {
    res.status(500).json({ msg: "Commit failed", error });
  }
};

// Get Commits of Project (populated with creator email)
exports.getCommits = async (req, res) => {
  try {
    const commits = await Commit.find({ projectId: req.params.projectId })
      .populate("createdBy", "name email")
      .sort({ createdAt: -1 });

    res.json(commits);
  } catch (error) {
    res.status(500).json({ msg: "Fetch commits failed", error });
  }
};