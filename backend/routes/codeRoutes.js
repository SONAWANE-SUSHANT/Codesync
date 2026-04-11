const router = require("express").Router();
const { runCode } = require("../controllers/codeController");

router.post("/run", runCode);

module.exports = router;