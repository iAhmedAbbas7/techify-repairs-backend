const User = require("../models/User");
const Session = require("../models/Session");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const asyncHandler = require("express-async-handler");

// @desc LOGIN
// @route POST /auth
// @access Public

const login = asyncHandler(async (req, res) => {
  // Retrieving the Username & Password from the Request Body
  const { username, password } = req.body;
  // If No Username & Password
  if (!username && !password) {
    return res
      .status(400)
      .json({ message: "Username & Password are Required" });
  }
  // If No Username
  if (!username && password) {
    return res.status(400).json({ message: "Username is Required" });
  }
  // If No Password
  if (!password && username) {
    return res.status(400).json({ message: "Password is Required" });
  }
  // Finding the User in User Model
  const foundUser = await User.findOne({ username }).exec();
  // In Case no User Found
  if (!foundUser) {
    return res.status(401).json({ message: `User ${username} not Found` });
  }
  // In Case Inactive User Found
  if (!foundUser.active) {
    return res
      .status(401)
      .json({ message: `User ${username} is not Authorized` });
  }
  // Matching the Password
  const match = await bcrypt.compare(password, foundUser.password);
  // If no Password Match
  if (!match) return res.status(401).json({ message: "Incorrect Password" });
  // Issuing an Access Token
  const accessToken = jwt.sign(
    {
      UserInfo: {
        username: foundUser.username,
        roles: foundUser.roles,
      },
    },
    process.env.ACCESS_TOKEN_SECRET,
    { expiresIn: "15m" }
  );
  // Issuing a Refresh Token
  const refreshToken = jwt.sign(
    { username: foundUser.username },
    process.env.REFRESH_TOKEN_SECRET,
    { expiresIn: "7d" }
  );
  // Creating Secure Cookie with Refresh Token
  res.cookie("jwt", refreshToken, {
    httpOnly: true,
    secure: true,
    sameSite: "none",
    maxAge: 7 * 24 * 60 * 60 * 1000,
  });
  // Checking if a User Already has an Active Login Session
  const existingSession = await Session.findOne({ userId: foundUser._id });
  // If Not, then Creating a Session on Login
  if (!existingSession) {
    await Session.create({
      userId: foundUser._id,
      username: foundUser.username,
    });
  }
  // Sending Access Token with Username & Roles
  res.json({ accessToken });
});

// @desc REFRESH
// @route GET /auth/refresh
// @access Public - As Access Token has Expired

const refresh = (req, res) => {
  // Retrieving Cookies from Request Body
  const cookies = req.cookies;
  // Error Handling
  if (!cookies?.jwt) return res.status(401).json({ message: "Unauthorized" });
  // Setting Refresh Token
  const refreshToken = cookies.jwt;
  // Verifying Refresh Token
  jwt.verify(
    refreshToken,
    process.env.REFRESH_TOKEN_SECRET,
    asyncHandler(async (err, decoded) => {
      // Error Handling
      if (err) return res.status(403).json({ message: "Forbidden" });
      // Founding User
      const foundUser = await User.findOne({ username: decoded.username });
      // If no User Found
      if (!foundUser) return res.status(401).json({ message: "Unauthorized" });
      // Issuing Access Token
      const accessToken = jwt.sign(
        {
          UserInfo: {
            username: foundUser.username,
            roles: foundUser.roles,
          },
        },
        process.env.ACCESS_TOKEN_SECRET,
        { expiresIn: "15m" }
      );
      return res.json({ accessToken });
    })
  );
};

// @desc LOGOUT
// @route GET /auth/logout
// @access Public - To clear Cookies if it Exists

const logout = asyncHandler(async (req, res) => {
  // Retrieving Cookies
  const cookies = req.cookies;
  // Error Handling
  if (!cookies?.jwt) return res.status(204);
  // Decoding Cookie
  const decoded = jwt.decode(cookies.jwt);
  // Removing User Session
  if (decoded?.username) {
    await Session.deleteOne({ username: decoded.username });
  }
  // If Cookie was Found
  res.clearCookie("jwt", {
    httpOnly: true,
    sameSite: "none",
    secure: true,
  });
  res.json({ message: "Cookie Cleared, Session Removed" });
});

module.exports = {
  login,
  refresh,
  logout,
};
