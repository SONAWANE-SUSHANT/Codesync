const router = require("express").Router();
const {
  createProject,
  getProjects,
  inviteUser,
  makePublic,
} = require("../controllers/projectController");

const auth = require("../middleware/authMiddleware");

router.post("/", auth, createProject);
router.get("/", auth, getProjects);

router.post("/invite", auth, inviteUser);
router.put("/public/:id", auth, makePublic);

module.exports = router;