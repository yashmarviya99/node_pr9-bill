const express = require("express");

const {
  register,
  adminRegister,
  login,
  adminLogin,
  logout,
  getMe,
  getRegistrationPaymentStatus,
  submitRegistrationPayment,
  verifyRegistrationPayment,
  rejectRegistrationPayment,
  getPendingRegistrationPayments,
  forgotPassword,
  verifyOtp,
  resetPassword,
} = require("../controllers/authController");

const {
  protect,
  registrationProtect,
  authorizeAdmin,
} = require("../middleware/authMiddleware");

const router = express.Router();

// ─── Registration / Login ─────────────────────────────────────────────────────
router.post("/register", register);
router.post("/admin/register", adminRegister);
router.post("/login", login);
router.post("/admin/login", adminLogin);
router.post("/logout", logout);
router.get("/me", protect, getMe);

// ─── Forgot Password / OTP Reset ─────────────────────────────────────────────
router.post("/forgot-password", forgotPassword);
router.post("/verify-otp", verifyOtp);
router.post("/reset-password", resetPassword);

// ─── Registration Payment ─────────────────────────────────────────────────────
router.get(
  "/registration-payment/status",
  registrationProtect,
  getRegistrationPaymentStatus
);

router.post(
  "/registration-payment",
  registrationProtect,
  submitRegistrationPayment
);

// ─── Admin Payment Management ─────────────────────────────────────────────────
router.get(
  "/admin/registration-payments/pending",
  protect,
  authorizeAdmin,
  getPendingRegistrationPayments
);

router.post(
  "/admin/registration-payment/:userId/verify",
  protect,
  authorizeAdmin,
  verifyRegistrationPayment
);

router.post(
  "/admin/registration-payment/:userId/reject",
  protect,
  authorizeAdmin,
  rejectRegistrationPayment
);

module.exports = router;
