const express = require("express");
const router = express.Router();

const authController = require("../controllers/authController");
const { protect } = require("../middleware/authMiddleware");

router.post("/register", function (req, res) { return authController.register(req, res); });
router.post("/login", function (req, res) { return authController.login(req, res); });
router.get("/me", function (req, res, next) { return protect(req, res, next); }, function (req, res) { return authController.getMe(req, res); });

module.exports = router;