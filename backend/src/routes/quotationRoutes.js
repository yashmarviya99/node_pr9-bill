const express = require("express");

const {
  createQuotation,
  getQuotations,
  getQuotationById,
  updateQuotation,
  deleteQuotation,
  getQuotationPdf,
} = require("../controllers/quotationController");

const {
  protect,
} = require("../middleware/authMiddleware");

const router = express.Router();

router.use(protect);

router.post(
  "/",
  createQuotation
);

router.get(
  "/",
  getQuotations
);

router.get(
  "/:id/pdf",
  getQuotationPdf
);

router.get(
  "/:id",
  getQuotationById
);

router.put(
  "/:id",
  updateQuotation
);

router.delete(
  "/:id",
  deleteQuotation
);

module.exports = router;