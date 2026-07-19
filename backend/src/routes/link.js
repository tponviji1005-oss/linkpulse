const express = require("express");

const { createLink, getMyLinks, getLink } = require("../controllers/linkController");
const auth = require("../middleware/auth");

const router = express.Router();

router.get("/", auth, getMyLinks);
router.get("/:id", auth, getLink);
router.post("/", auth, createLink);

module.exports = router;
