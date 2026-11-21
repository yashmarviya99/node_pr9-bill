const express = require("express");

const {
  createPurchase,
  getPurchases,
  getPurchaseById,
  getPurchaseInvoicePdf,
  deletePurchase,
} = require("../controllers/purchaseController");

const {
  protect,
} = require("../middleware/authMiddleware");

const router =
  express.Router();

router.use(protect);

router.post(
  "/",
  createPurchase
);

router.get(
  "/",
  getPurchases
);

// IMPORTANT:
// PDF route must come before /:id
router.get(
  "/:id/pdf",
  getPurchaseInvoicePdf
);

router.get(
  "/:id",
  getPurchaseById
);

router.delete(
  "/:id",
  deletePurchase
);

module.exports = router;