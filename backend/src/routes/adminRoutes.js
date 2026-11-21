const express = require("express");

const {
  getAllUsers,
  getSingleUser,
  activateUser,
  deactivateUser,
  suspendUser,
  unsuspendUser,
} = require("../controllers/adminController");

const {
  protect,
  authorizeAdmin,
} = require("../middleware/authMiddleware");

const router =
  express.Router();

/*
|--------------------------------------------------------------------------
| ADMIN USER MANAGEMENT
|--------------------------------------------------------------------------
*/

/*
  GET /api/admin/users

  Search / filter / pagination
*/
router.get(
  "/users",
  protect,
  authorizeAdmin,
  getAllUsers
);

/*
  GET /api/admin/users/:userId

  Get single user details
*/
router.get(
  "/users/:userId",
  protect,
  authorizeAdmin,
  getSingleUser
);

/*
  PATCH /api/admin/users/:userId/activate

  Activate user
*/
router.patch(
  "/users/:userId/activate",
  protect,
  authorizeAdmin,
  activateUser
);

/*
  PATCH /api/admin/users/:userId/deactivate

  Deactivate user
*/
router.patch(
  "/users/:userId/deactivate",
  protect,
  authorizeAdmin,
  deactivateUser
);

/*
  PATCH /api/admin/users/:userId/suspend

  Suspend user
*/
router.patch(
  "/users/:userId/suspend",
  protect,
  authorizeAdmin,
  suspendUser
);

/*
  PATCH /api/admin/users/:userId/unsuspend

  Unsuspend user
*/
router.patch(
  "/users/:userId/unsuspend",
  protect,
  authorizeAdmin,
  unsuspendUser
);

module.exports = router;