const { format } = require("date-fns");
const { v4: uuid } = require("uuid");
const fs = require("fs");
const fsPromises = require("fs").promises;
const path = require("path");

// Main Logger Function
const logEvents = async (message, logFileName) => {
  // Creating the Date & Time format for Log Items
  const dateTime = format(new Date(), "yyyyMMdd\tHH:mm:ss");
  // Creating the Log Item
  const logItem = `${dateTime}\t${uuid()}\t${message}\n`;
  try {
    // Checking if the Logs Directory Exists
    if (!fs.existsSync(path.join(__dirname, "..", "logs"))) {
      await fsPromises.mkdir(path.join(__dirname, "..", "logs"));
    }
    // Appending the Log Item to the Log File
    await fsPromises.appendFile(
      path.join(__dirname, "..", "logs", logFileName),
      logItem
    );
  } catch (err) {
    console.log(err);
  }
};

// Logger Middleware
const logger = (req, res, next) => {
  logEvents(`${req.method}\t${req.url}\t${req.headers.origin}`, "reqLog.log");
  console.log(`${req.method} ${req.path}`);
  next();
};

module.exports = { logger, logEvents };
