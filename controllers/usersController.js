const fs = require("fs");
const path = require("path");
const User = require("../models/User");
const Note = require("../models/Note");
const asyncHandler = require("express-async-handler");
const bcrypt = require("bcrypt");

// Multer Logic for Handling File Uploads
const multer = require("multer");
// Using Memory Storage for Multer to Process Files Before Saving
const storage = multer.memoryStorage();
// Creating Multer Upload Instance
const upload = multer({ storage: storage });
// Exporting the Upload Middleware
const uploadAvatar = upload.single("avatar");

// @Desc    Get All Users
// @Route   GET /users
// @Access  Private

const getAllUsers = asyncHandler(async (req, res) => {
  //Getting all Users from MongoDB
  const users = await User.find().select("-password").lean();
  // If No Users Found
  if (!users?.length) {
    return res.status(400).json({ message: "No Users Found" });
  }
  // Sending the Users
  res.json(users);
});

// @Desc    Create New User
// @Route   POST /users
// @Access  Private

const createNewUser = asyncHandler(async (req, res) => {
  // Destructuring Request Body
  const { username, password, roles } = req.body;
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
  // Checking for Duplicate User
  const duplicate = await User.findOne({ username })
    .collation({ locale: "en", strength: 2 })
    .lean()
    .exec();
  if (duplicate) {
    return res.status(409).json({ message: `User ${username} Already Exists` });
  }
  // Hash Password
  const hashedPwd = await bcrypt.hash(password, 10);
  // Roles Processing
  let parsedRoles = [];
  if (roles) {
    // If Roles is Already an Array, Saving it AII
    if (Array.isArray(roles)) {
      parsedRoles = roles;
    } else if (typeof roles === "string") {
      // Checking if the Roles isn't an Array, but is a String
      try {
        // If the String is Valid JSON, Converting String in to an Array & Saving
        const jsonParsed = JSON.parse(roles);
        if (Array.isArray(jsonParsed)) {
          parsedRoles = jsonParsed;
        } else {
          // If JSON Parse isn't an Array, Splitting at the Comma & Saving
          parsedRoles = roles.includes(",")
            ? roles.split(",").map((role) => role.trim())
            : // If is a Single Role String and no Comma Present, Saving it as an Array
              [roles];
        }
      } catch (err) {
        // If String isn't Valid JSON, Splitting at the Comma & Saving
        parsedRoles = roles.includes(",")
          ? roles.split(",").map((role) => role.trim())
          : [roles];
      }
    }
  }
  // Creating the User Object
  const userObject = { username, password: hashedPwd };
  // If Roles are Provided
  if (parsedRoles.length) {
    userObject.roles = parsedRoles;
  }
  // Handling Avatar Upload
  if (req.file) {
    // Setting the Path for Uploads Directory
    const uploadsDir = path.join(__dirname, "..", "uploads");
    // Checking if Directory Exists, if not then Creating
    if (!fs.existsSync(uploadsDir)) {
      fs.mkdirSync(uploadsDir, { recursive: true });
    }
    // Creating Unique Suffix to Append to the Filename
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    // Creating the Filename
    const filename =
      req.file.fieldname + "-" + uniqueSuffix + "-" + req.file.originalname;
    // Creating the Full File Path
    const fullFilePath = path.join(uploadsDir, filename);
    // Writing the File to the Folder
    fs.writeFileSync(fullFilePath, req.file.buffer);
    // Setting the Full File Path for the Avatar
    userObject.avatar = `${req.protocol}://${req.get(
      "host"
    )}/uploads/${filename}`;
  }
  // Creating New User
  const user = await User.create(userObject);
  if (user) {
    return res
      .status(201)
      .json({ message: `User ${username} Created Successfully` });
  } else {
    res.status(400).json({ message: "Invalid User Data Received" });
  }
});

// @Desc    Update User
// @Route   PATCH /users
// @Access  Private

const updateUser = asyncHandler(async (req, res) => {
  // Destructuring Request Body
  const { username, password, roles, active } = req.body;
  // ID Handling
  const userId = req.body.id;
  // If No ID
  if (!userId) {
    return res
      .status(400)
      .json({ message: "User ID is Required to Perform this Action" });
  }
  // If No Username
  if (!username) {
    return res.status(400).json({ message: "Username is Required" });
  }
  // Finding the User
  const user = await User.findById(userId).exec();
  // If No User
  if (!user) {
    return res.status(400).json({ message: `User ${username} Not Found` });
  }
  // Checking for Duplicate User on the Basis of Username
  const duplicate = await User.findOne({ username })
    .collation({ locale: "en", strength: 2 })
    .lean()
    .exec();
  // If Duplicate Username Found
  if (duplicate && duplicate?._id.toString() !== userId) {
    return res.status(409).json({ message: `User ${username} Already Exists` });
  }
  // <----- Users Role Handling ----- > //
  let parsedRoles = [];
  if (roles) {
    // If Roles is Already an Array, Saving it AII
    if (Array.isArray(roles)) {
      parsedRoles = roles;
    } else if (typeof roles === "string") {
      // Checking if the Roles isn't an Array, but is a String
      try {
        // If the String is Valid JSON, Converting String in to an Array & Saving
        const jsonParsed = JSON.parse(roles);
        if (Array.isArray(jsonParsed)) {
          parsedRoles = jsonParsed;
        } else {
          // If JSON Parse isn't an Array, Splitting at the Comma & Saving
          parsedRoles = roles.includes(",")
            ? roles.split(",").map((role) => role.trim())
            : // If is a Single Role String and no Comma Present, Saving it as an Array
              [roles];
        }
      } catch (err) {
        // If String isn't Valid JSON, Splitting at the Comma & Saving
        parsedRoles = roles.includes(",")
          ? roles.split(",").map((role) => role.trim())
          : [roles];
      }
    }
  }
  // <----- Delete Avatar Logic ----- > //
  // Checking if the Delete Avatar Flag was Provided
  if (req.body.deleteAvatar === "true") {
    // If Users Avatar is not Default Avatar then Proceed
    if (user.avatar && user.avatar !== "") {
      // Splitting the Avatar Filename
      const parts = user.avatar.split("/uploads/");
      if (parts.length === 2) {
        // Selecting the Avatar Filename
        const filename = parts[1];
        // Setting the Avatar Path
        const filePath = path.join(__dirname, "..", "uploads", filename);
        // Checking if the Avatar Exists
        if (fs.existsSync(filePath)) {
          // Deleting the Avatar
          fs.unlinkSync(filePath);
        }
      }
      // Setting the Avatar to Default Avatar after Deletion
      user.avatar = "";
    }
  }
  // If Roles are Provided
  if (parsedRoles.length) {
    user.roles = parsedRoles;
  }
  // Updating the User to the Original User
  user.username = username;
  // Handling Active State
  if (active !== undefined && active !== null && active !== "") {
    // If Active is not Undefined, Null or Empty
    if (typeof active === "string") {
      // If Active Passed as String, Checking Against Lowercase True will set it to True
      user.active = active.toLowerCase() === "true";
    } else {
      // If Active is Passed as Boolean, Assigning it AII
      user.active = active;
    }
  }
  // Setting Users Password if Provided
  if (password) {
    user.password = await bcrypt.hash(password, 10);
  }
  // <----- Add Avatar Logic ----- > //
  if (req.file) {
    // Setting the Path for Uploads Directory
    const uploadsDir = path.join(__dirname, "..", "uploads");
    // Checking if Directory Exists, if not then Creating
    if (!fs.existsSync(uploadsDir)) {
      fs.mkdirSync(uploadsDir, { recursive: true });
    }
    // Creating Unique Suffix to Append to the Filename
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    // Creating the Filename
    const filename =
      req.file.fieldname + "-" + uniqueSuffix + "-" + req.file.originalname;
    // Creating the Full File Path
    const fullFilePath = path.join(uploadsDir, filename);
    // Writing the File to the Folder
    fs.writeFileSync(fullFilePath, req.file.buffer);
    // Setting the Full File Path for the Avatar
    user.avatar = `${req.protocol}://${req.get("host")}/uploads/${filename}`;
  }
  const updatedUser = await user.save();
  res.json({
    message: `${updatedUser.username} has been Successfully Updated !`,
  });
});

// @Desc    Delete User
// @Route   DELETE /users
// @Access  Private

const deleteUser = asyncHandler(async (req, res) => {
  // Destructuring the ID
  const { id } = req.body;
  if (!id) {
    return res
      .status(400)
      .json({ message: "User ID is Required to Perform this Action!" });
  }
  // Checking for the Assigned Notes
  const note = await Note.findOne({ user: id }).lean().exec();
  if (note) {
    return res.status(400).json({ message: "User has Assigned Notes" });
  }
  // Finding the User
  const user = await User.findById(id).exec();
  if (!user) {
    return res.status(400).json({ message: "User Not Found" });
  }
  // Deleting the User
  await user.deleteOne();
  const result = `Username ${user.username} with ID ${user._id} has been Deleted !`;
  res.json(result);
});

module.exports = {
  uploadAvatar,
  getAllUsers,
  createNewUser,
  updateUser,
  deleteUser,
};
