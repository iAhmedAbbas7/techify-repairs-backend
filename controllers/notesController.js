const User = require("../models/User");
const Note = require("../models/Note");
const asyncHandler = require("express-async-handler");

// @Desc    Get All Notes
// @Route   GET /notes
// @Access  Private

const getAllNotes = asyncHandler(async (req, res) => {
  // Retrieving the Logged In User Roles from Requested User Roles
  const userRoles = req.roles || [];
  let notes;
  // Admins & Managers will Access all Notes
  if (userRoles.includes("Admin") || userRoles.includes("Manager")) {
    notes = await Note.find().lean();
  } else {
    // For Employees, Finding the User from User Model Through Requested Users Username
    const user = await User.findOne({ username: req.user }).lean().exec();
    // If No User Found
    if (!user) {
      return res.status(404).json({ message: "User Not Found" });
    }
    // Returning the Notes Assigned to the Logged In User Only
    notes = await Note.find({ user: user._id }).lean();
  }
  // Adding the Username & Avatar Property to the Notes
  const notesWithUser = await Promise.all(
    notes.map(async (note) => {
      const user = await User.findById(note.user).lean().exec();
      return {
        ...note,
        username: user.username,
        avatar: user.avatar,
      };
    })
  );
  // Returning the Notes with Assigned Users Information
  res.json(notesWithUser);
});

// @Desc    Create New Note
// @Route   GET /notes
// @Access  Private

const createNewNote = asyncHandler(async (req, res) => {
  // Destructuring the Request Body
  const { user, title, text } = req.body;
  // If No User
  if (!user && title && text) {
    return res.status(400).json({ message: "Note has no Assigned User" });
  }
  // If No Title
  if (!title && user && text) {
    return res.status(400).json({ message: "Note Title is Required" });
  }
  // If No Text
  if (!text && title && user) {
    return res.status(400).json({ message: "Note Text is Required" });
  }
  // If No Title, Text & User
  if (!text && !title && !user) {
    return res.status(400).json({ message: "All Fields are Required" });
  }
  // If No Title & Text
  if (!text && !title && user) {
    return res.status(400).json({ message: "Note Title & Text is Required" });
  }
  // Checking for Duplicate Notes
  const duplicate = await Note.findOne({ title })
    .collation({ locale: "en", strength: 2 })
    .lean()
    .exec();
  if (duplicate) {
    return res.status(409).json({ message: `Note ${title} Already Exists` });
  }
  // Creating & Storing New Note
  const note = await Note.create({ user, title, text });
  if (note) {
    return res.status(201).json({ message: "Note Created Successfully" });
  } else {
    return res.status(400).json({ message: "Note Creation Failed" });
  }
});

// @Desc    Update Note
// @Route   GET /notes
// @Access  Private

const updateNote = asyncHandler(async (req, res) => {
  // Destructuring the Request Body
  const { id, user, title, text, completed } = req.body;
  // If No User
  if (!user && title && text) {
    return res.status(400).json({ message: "Note has no Assigned User" });
  }
  // If No Title
  if (!title && user && text) {
    return res.status(400).json({ message: "Note Title is Required" });
  }
  // If No Text
  if (!text && title && user) {
    return res.status(400).json({ message: "Note Text is Required" });
  }
  // If No Title, Text & User
  if (!text && !title && !user) {
    return res.status(400).json({ message: "All Fields are Required" });
  }
  // If No Title & Text
  if (!text && !title && user) {
    return res.status(400).json({ message: "Note Title & Text is Required" });
  }
  // If Invalid Status
  if (typeof completed !== "boolean") {
    return res.status(400).json({ message: "Unknown Error" });
  }
  // Finding the Note to Update
  const note = await Note.findById(id).exec();
  // Error Handling
  if (!note) {
    return res.status(400).json({ message: "Note Not Found" });
  }
  // Checking for Note with Duplicate Title
  const duplicate = await Note.findOne({ title })
    .collation({ locale: "en", strength: 2 })
    .lean()
    .exec();
  // Allowing Update to the Requested Note
  if (duplicate && duplicate?._id.toString() !== id) {
    return res.status(409).json({ message: `Note ${title} Already Exists` });
  }
  // Calculating the Repair Time When Note is Mark Completed
  if (!note.completed && completed === true) {
    // Calculating Repair Time in Minutes
    const repairTime = (Date.now() - note.createdAt.getTime()) / 60000;
    note.repairTime = repairTime;
  }
  // Updating the Note
  note.user = user;
  note.title = title;
  note.text = text;
  note.completed = completed;

  const updatedNote = await note.save();
  res.json({ message: `${updatedNote.title} has been Successfully Updated !` });
});

// @Desc    Delete Note
// @Route   GET /notes
// @Access  Private

const deleteNote = asyncHandler(async (req, res) => {
  // Destructuring the ID from Request Body
  const { id } = req.body;
  // Data Validation
  if (!id) {
    return res.status(400).json({ message: "Note ID is Required !" });
  }
  // Finding the Note to Delete
  const note = await Note.findById(id).exec();
  // Error Handling
  if (!note) {
    return res.status(400).json({ message: "Note Not Found" });
  }
  // Deleting the Note
  await note.deleteOne();
  const result = `Note ${note.title} with ID ${note._id} has been Successfully Deleted !`;
  res.json(result);
});

module.exports = {
  getAllNotes,
  createNewNote,
  updateNote,
  deleteNote,
};
