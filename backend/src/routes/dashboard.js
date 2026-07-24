const express = require("express");

const { getDashboardSummary, getTopLinks } = require("../controllers/dashboardController");
const auth = require("../middleware/auth");

const router = express.Router();

router.get("/", auth, getDashboardSummary);
router.get("/top-links", auth, getTopLinks);

module.exports = router;
