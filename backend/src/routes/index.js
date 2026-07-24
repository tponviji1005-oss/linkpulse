const express = require("express");

const authRoutes = require("./auth");
const linkRoutes = require("./link");
const dashboardRoutes = require("./dashboard");

const router = express.Router();

router.use("/auth", authRoutes);
router.use("/links", linkRoutes);
router.use("/dashboard", dashboardRoutes);

module.exports = router;
