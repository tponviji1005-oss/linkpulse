const express = require("express");

const { createLink, getMyLinks, getLink, updateLink, deleteLink } = require("../controllers/linkController");
const auth = require("../middleware/auth");

const router = express.Router();

router.get("/", auth, getMyLinks);
router.get("/:id", auth, getLink);
router.put("/:id", auth, updateLink);
router.delete("/:id", auth, deleteLink);
router.post("/", auth, createLink);

module.exports = router;
