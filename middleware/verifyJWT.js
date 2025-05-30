const jwt = require("jsonwebtoken");

const verifyJWT = (req, res, next) => {
  // Check for Auth Headers
  const authHeader = req.headers.authorization || req.headers.Authorization;
  // In case no Token Found
  if (!authHeader?.startsWith("Bearer ")) {
    return res.status(401).json({ message: "Unauthorized" });
  }
  // Retrieving the Token from Auth Headers
  const token = authHeader.split(" ")[1];
  // Verifying the Token
  jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (err, decoded) => {
    // Error handling
    if (err) return res.status(403).json({ message: "Forbidden" });
    // Adding Custom Request Properties to the Request Object by Decoding the UserInfo Object
    req.user = decoded.UserInfo.username;
    req.roles = decoded.UserInfo.roles;
    next();
  });
};

module.exports = verifyJWT;
