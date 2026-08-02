const express = require("express");

const { createLink, getMyLinks, getLink, updateLink, deleteLink, updateGeoRules, updateDeviceRules, updateABVariants, getLinkAnalytics, generateQRCode, verifyPassword } = require("../controllers/linkController");
const auth = require("../middleware/auth");

const router = express.Router();

router.get("/", auth, getMyLinks);
router.get("/:id/analytics", auth, getLinkAnalytics);
router.get("/:id/qrcode", auth, generateQRCode);
router.get("/:id", auth, getLink);
router.put("/:id/geo-rules", auth, updateGeoRules);
router.put("/:id/device-rules", auth, updateDeviceRules);
router.put("/:id/ab-variants", auth, updateABVariants);
router.put("/:id", auth, updateLink);
router.delete("/:id", auth, deleteLink);
router.post("/", auth, createLink);
router.post("/:id/verify-password", verifyPassword);

module.exports = router;
