// <------ Declarations ------> ///
/// <reference path="./types/express.d.ts" />

// Imports
require("dotenv").config();
const express = require("express");
const app = express();
const path = require("path");
const cookieParser = require("cookie-parser");
const cors = require("cors");
const corsOptions = require("./config/corsOptions");
const { logger, logEvents } = require("./middleware/logger");
const errorHandler = require("./middleware/errorHandler");
const connectDB = require("./config/dbConn");
const mongoose = require("mongoose");
const PORT = process.env.PORT || 3500;

// Database Connection
connectDB();
// Middleware for Logger
app.use(logger);
// Middleware for CORS
app.use(cors(corsOptions));
// Middleware for Parsing Form Data
app.use(express.urlencoded({ extended: false }));
// Middleware for Parsing JSON Data
app.use(express.json());
// Middleware for Parsing Cookies
app.use(cookieParser());

// Middleware for Static Files
app.use("/", express.static(path.join(__dirname, "public")));
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

// Middleware for App Routes
app.use("/", require("./routes/root"));
app.use("/auth", require("./routes/authRoutes"));
app.use("/users", require("./routes/userRoutes"));
app.use("/notes", require("./routes/noteRoutes"));
app.use("/analytics", require("./routes/analyticsRoutes"));
// Middleware for Handling 404 Response
app.all("*", (req, res) => {
  res.status(404);
  if (req.accepts("html")) {
    res.sendFile(path.join(__dirname, "views", "404.html"));
  } else if (req.accepts("json")) {
    res.json({ message: "404 : Page Not Found" });
  } else {
    res.type("txt").send("404 : Page Not Found");
  }
});

// Middleware for Error Handling
app.use(errorHandler);

// Listener for Server & Database Connection
mongoose.connection.once("open", () => {
  console.log("Database Connection Established Successfully");
  app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
  });
});

// Listener for Database Connection Error
mongoose.connection.on("error", (err) => {
  console.log(err);
  logEvents(
    `${err.no}: ${err.code}\t${err.syscall}\t${err.hostname}`,
    "mongoErrLog.log"
  );
});
