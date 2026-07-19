const express = require("express");

const { createLink, getMyLinks } = require("../controllers/linkController");
const auth = require("../middleware/auth");

const router = express.Router();

router.get("/", auth, getMyLinks);
router.post("/", auth, createLink);

module.exports = router;
