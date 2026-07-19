const express = require("express");

const { createLink } = require("../controllers/linkController");
const auth = require("../middleware/auth");

const router = express.Router();

router.post("/", auth, createLink);

module.exports = router;
