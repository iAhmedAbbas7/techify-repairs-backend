const express = require("express");
const router = express.Router();
const analyticsController = require("../controllers/analyticsController");
const verifyJWT = require("../middleware/verifyJWT");

// Using JWT Verification
router.use(verifyJWT);

router.get("/", analyticsController.getAnalyticsData);
router.get("/notes-repair-trend", analyticsController.getNotesRepairTrend);
router.get("/user-notes-stats", analyticsController.getUserNotesStats);
router.get("/active-users", analyticsController.getActiveUsers);
router.get(
  "/employee-performance",
  analyticsController.getEmployeePerformanceMetrics
);
router.get(
  "/repair-time-distribution",
  analyticsController.getRepairTimeDistribution
);
router.get("/notes-creation-trend", analyticsController.getNotesCreationTrend);

module.exports = router;
