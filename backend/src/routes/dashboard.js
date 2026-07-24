const express = require("express");

const { getDashboardSummary } = require("../controllers/dashboardController");
const auth = require("../middleware/auth");

const router = express.Router();

router.get("/", auth, getDashboardSummary);

module.exports = router;
