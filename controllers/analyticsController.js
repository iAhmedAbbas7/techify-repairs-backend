const Note = require("../models/Note");
const asyncHandler = require("express-async-handler");
const Session = require("../models/Session");

// @desc Analytics Data for Repairs Tracking
// @ GET /analytics
// @access Private

const getAnalyticsData = asyncHandler(async (_req, res) => {
  // Total Notes
  const totalNotes = await Note.countDocuments();
  // Total Number of Repairs
  const totalRepairsAgg = await Note.aggregate([
    { $match: { completed: true } },
    { $count: "count" },
  ]);
  const totalRepairs =
    totalRepairsAgg.length > 0 ? totalRepairsAgg[0].count : 0;
  // Average Repair Time (Repair Time in Days)
  const avgRepairTimeAgg = await Note.aggregate([
    { $match: { completed: true } },
    { $group: { _id: null, avgRepairTime: { $avg: "$repairTime" } } },
  ]);
  const avgRepairTime =
    avgRepairTimeAgg.length > 0
      ? Math.round(avgRepairTimeAgg[0].avgRepairTime / 1440)
      : 0;
  // Repair Trends : (Number of Repairs in the Past 7 Days)
  const repairsTrend = await Note.aggregate([
    {
      $match: {
        completed: true,
        createdAt: {
          $gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
        },
      },
    },
    {
      $group: {
        _id: {
          $dateToString: { format: "%d-%m-%Y", date: "$createdAt" },
        },
        count: { $sum: 1 },
      },
    },
    { $sort: { _id: -1 } },
  ]);
  // Sending Response
  res.json({
    totalNotes,
    totalRepairs,
    avgRepairTime,
    repairsTrend,
  });
});

// @ desc Getting Repair Data for Notes
// @ GET /analytics/notes-repair-trend
// @ access Private

const getNotesRepairTrend = asyncHandler(async (_req, res) => {
  const repairTimesData = await Note.aggregate([
    {
      $match: {
        completed: true,
        repairTime: { $exists: true },
      },
    },
    {
      $project: {
        createdAt: 1,
        repairTimeDays: { $divide: ["$repairTime", 1440] },
      },
    },
    {
      $sort: { createdAt: 1 },
    },
  ]);
  res.json(repairTimesData);
});

// @ desc Analytics Data for Users Notes Statistics
// @ GET /analytics/user-notes-stats
// @ access Private

const getUserNotesStats = asyncHandler(async (_req, res) => {
  // Getting the Notes Data Based on Users
  const userNotesStats = await Note.aggregate([
    {
      $match: {
        createdAt: {
          $gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
        },
      },
    },
    {
      $group: {
        _id: "$user",
        completedCount: {
          $sum: { $cond: [{ $eq: ["$completed", true] }, 1, 0] },
        },
        pendingCount: {
          $sum: { $cond: [{ $eq: ["$completed", false] }, 1, 0] },
        },
      },
    },
    {
      $lookup: {
        from: "users",
        localField: "_id",
        foreignField: "_id",
        as: "userInfo",
      },
    },
    { $unwind: "$userInfo" },
    {
      $project: {
        _id: 0,
        userId: "$_id",
        username: "$userInfo.username",
        completedCount: 1,
        pendingCount: 1,
      },
    },
    { $sort: { username: 1 } },
  ]);
  res.json(userNotesStats);
});

// @desc Getting Active Logged In Users
// @route GET /analytics/active-users
// @access Private

const getActiveUsers = asyncHandler(async (_req, res) => {
  const activeUsers = await Session.find().select("username loginTime");
  res.json(activeUsers);
});

// @desc Getting Employee Performance Metrics
// @route GET /analytics/employee-performance
// @access Private

const getEmployeePerformanceMetrics = asyncHandler(async (_req, res) => {
  // Getting Employees Performance Based on Notes Completed (Past 7 Days)
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
  const employeePerformance = await Note.aggregate([
    {
      $match: { completed: true, createdAt: { $gte: sevenDaysAgo } },
    },
    { $group: { _id: "$user", completedCount: { $sum: 1 } } },
    {
      $lookup: {
        from: "users",
        localField: "_id",
        foreignField: "_id",
        as: "userInfo",
      },
    },
    { $unwind: "$userInfo" },
    {
      $project: {
        _id: 0,
        username: "$userInfo.username",
        completedCount: 1,
      },
    },
    { $sort: { completedCount: -1 } },
  ]);
  res.json(employeePerformance);
});

// @desc Getting Repair Time Distribution
// @route GET /analytics/repair-time-distribution
// @access Private

const getRepairTimeDistribution = asyncHandler(async (_req, res) => {
  const repairTimeBuckets = await Note.aggregate([
    { $match: { completed: true, repairTime: { $exists: true } } },
    {
      $bucket: {
        groupBy: "$repairTime",
        boundaries: [0, 2880, 7200, 14400, Infinity],
        default: ">10Days",
        output: { count: { $sum: 1 } },
      },
    },
  ]);
  res.json(repairTimeBuckets);
});

// @desc Notes Creation Trend
// @route GET /analytics/notes-creation-trend
// @access Private

const getNotesCreationTrend = asyncHandler(async (_req, res) => {
  // Getting Notes Creation Trend (7 Days)
  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
  const notesTrend = await Note.aggregate([
    { $match: { createdAt: { $gte: sevenDaysAgo } } },
    {
      $group: {
        _id: { $dateToString: { format: "%d-%m-%Y", date: "$createdAt" } },
        count: { $sum: 1 },
      },
    },
    { $sort: { _id: 1 } },
  ]);
  res.json(notesTrend);
});

//

module.exports = {
  getAnalyticsData,
  getNotesRepairTrend,
  getUserNotesStats,
  getActiveUsers,
  getEmployeePerformanceMetrics,
  getRepairTimeDistribution,
  getNotesCreationTrend,
};
