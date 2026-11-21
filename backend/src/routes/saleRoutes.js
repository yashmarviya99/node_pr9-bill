const express = require("express");

const {
  createSale,
  getSales,
  getSaleById,
  getSaleInvoicePdf,
  deleteSale,
} = require("../controllers/saleController");

const {
  protect,
} = require("../middleware/authMiddleware");

const router = express.Router();

router.use(protect);

router.post(
  "/",
  createSale
);

router.get(
  "/",
  getSales
);

// IMPORTANT:
// PDF route must be before /:id
router.get(
  "/:id/pdf",
  getSaleInvoicePdf
);

router.get(
  "/:id",
  getSaleById
);

router.delete(
  "/:id",
  deleteSale
);

module.exports = router;