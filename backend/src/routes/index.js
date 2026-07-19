const express = require("express");

const authRoutes = require("./auth");
const linkRoutes = require("./link");

const router = express.Router();

router.use("/auth", authRoutes);
router.use("/links", linkRoutes);

module.exports = router;
