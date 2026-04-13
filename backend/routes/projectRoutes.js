const router = require("express").Router();
const {
  createProject,
  getProjects,
  inviteUser,
  changeRole,
  getMembers,
  makePublic,
} = require("../controllers/projectController");
const auth = require("../middleware/authMiddleware");

router.post("/", auth, createProject);
router.get("/", auth, getProjects);
router.post("/invite", auth, inviteUser);
router.put("/role", auth, changeRole);
router.get("/:projectId/members", auth, getMembers);
router.put("/public/:id", auth, makePublic);

module.exports = router;