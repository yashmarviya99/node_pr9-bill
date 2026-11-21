const express = require("express");

const {
  createAccount,
  getAccounts,
  getAccountById,
  updateAccount,
  deleteAccount,
} = require("../controllers/accountController");

const {
  protect,
} = require("../middleware/authMiddleware");

const router = express.Router();

// Authentication required
router.use(protect);

// Create Account
router.post("/", createAccount);

// Get all Accounts
router.get("/", getAccounts);

// Get single Account
router.get("/:id", getAccountById);

// Update Account
router.put("/:id", updateAccount);

// Delete Account
router.delete("/:id", deleteAccount);

module.exports = router;