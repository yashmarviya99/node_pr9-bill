const express = require("express");

const {
  createPayment,
  getPayments,
  getPaymentById,
  updatePayment,
  deletePayment,
} = require("../controllers/paymentController");

const { protect } = require("../middleware/authMiddleware");

const router = express.Router();

// All payment routes require authentication
router.use(protect);

// Create payment
router.post("/", createPayment);

// Get all payments
router.get("/", getPayments);

// Get single payment
router.get("/:id", getPaymentById);

// Update payment
router.put("/:id", updatePayment);

// Delete payment
router.delete("/:id", deletePayment);

module.exports = router;