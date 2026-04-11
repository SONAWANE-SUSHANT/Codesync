const Project = require("../models/Project");
const User = require("../models/User");

// Create Project
exports.createProject = async (req, res) => {
  try {
    const project = await Project.create({
      name: req.body.name,
      owner: req.user.id,
      members: [
        {
          user: req.user.id,
          role: "owner",
        },
      ],
    });

    res.json(project);
  } catch (error) {
    res.status(500).json({ msg: "Project creation failed" });
  }
};

// Get Projects
exports.getProjects = async (req, res) => {
  try {
    const projects = await Project.find({
      "members.user": req.user.id,
    });

    res.json(projects);
  } catch (error) {
    res.status(500).json({ msg: "Fetch failed" });
  }
};

// Invite User
exports.inviteUser = async (req, res) => {
  try {
    const { email, projectId } = req.body;

    const user = await User.findOne({ email });
    if (!user) return res.status(404).json({ msg: "User not found" });

    const project = await Project.findById(projectId);

    project.members.push({
      user: user._id,
      role: "member",
    });

    await project.save();

    res.json({ msg: "User added" });
  } catch (error) {
    res.status(500).json({ msg: "Invite failed" });
  }
};

// Make Public
exports.makePublic = async (req, res) => {
  try {
    await Project.findByIdAndUpdate(req.params.id, {
      isPublic: true,
    });

    res.json({ msg: "Project is now public" });
  } catch (error) {
    res.status(500).json({ msg: "Failed" });
  }
};