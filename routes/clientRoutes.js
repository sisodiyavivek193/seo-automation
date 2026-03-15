const express = require("express");
const router = express.Router();

const c = require("../controllers/clientController");
const { protect } = require("../middleware/authMiddleware");

function auth(req, res, next) { return protect(req, res, next); }

router.get("/", auth, function (req, res) { return c.getClients(req, res); });
router.get("/:id", auth, function (req, res) { return c.getClientById(req, res); });
router.post("/", auth, function (req, res) { return c.createClient(req, res); });
router.put("/:id", auth, function (req, res) { return c.updateClient(req, res); });
router.delete("/:id", auth, function (req, res) { return c.deleteClient(req, res); });

module.exports = router;