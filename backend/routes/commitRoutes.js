const router = require("express").Router();
const { createCommit, getCommits } = require("../controllers/commitController");
const auth = require("../middleware/AuthMiddleware");

router.post("/", auth, createCommit);
router.get("/:projectId", auth, getCommits);

module.exports = router;