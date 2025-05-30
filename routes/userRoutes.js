const express = require("express");
const router = express.Router();
const usersController = require("../controllers/usersController");
const verifyJWT = require("../middleware/verifyJWT");

// Using JWT Verification
router.use(verifyJWT);

router
  .route("/")
  .get(usersController.getAllUsers)
  .post(usersController.uploadAvatar, usersController.createNewUser)
  .patch(usersController.uploadAvatar, usersController.updateUser)
  .delete(usersController.deleteUser);

module.exports = router;
