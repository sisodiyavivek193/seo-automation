const express = require("express");
const router = express.Router();
const r = require("../controllers/reportController");
const { protect } = require("../middleware/authMiddleware");

function auth(req, res, next) { return protect(req, res, next); }

// Existing routes
router.get("/stats", auth, (req, res) => r.getStats(req, res));
router.post("/", auth, (req, res) => r.createReport(req, res));
router.get("/", auth, (req, res) => r.getReports(req, res));
router.get("/client/:id", auth, (req, res) => r.getReportsByClient(req, res));
router.delete("/:id", auth, (req, res) => r.deleteReport(req, res));
router.get("/:id/download", auth, (req, res) => r.downloadReport(req, res));

// ✅ NEW: Approval workflow routes
router.get("/:id/preview", auth, (req, res) => r.getReportPreview(req, res));
router.post("/:id/rewrite", auth, (req, res) => r.rewriteWithAI(req, res));
router.post("/:id/approve", auth, (req, res) => r.approveReport(req, res));
router.post("/:id/reject", auth, (req, res) => r.rejectReport(req, res));

module.exports = router;


// const express = require("express");
// const router = express.Router();
// const r = require("../controllers/reportController");
// const { protect } = require("../middleware/authMiddleware");

// function auth(req, res, next) { return protect(req, res, next); }

// router.get("/stats", auth, (req, res) => r.getStats(req, res));
// router.post("/", auth, (req, res) => r.createReport(req, res));
// router.get("/", auth, (req, res) => r.getReports(req, res));
// router.get("/client/:id", auth, (req, res) => r.getReportsByClient(req, res));
// router.delete("/:id", auth, (req, res) => r.deleteReport(req, res));
// router.get("/:id/download", auth, (req, res) => r.downloadReport(req, res));

// module.exports = router;
