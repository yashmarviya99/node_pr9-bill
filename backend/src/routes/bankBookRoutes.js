const express = require("express");

const {
  getBankBook,
  getBankBookSummary,
  getBankBookPdf,
} = require("../controllers/bankBookController");

const {
  protect,
} = require("../middleware/authMiddleware");

const router = express.Router();

router.use(protect);

router.get("/", getBankBook);

router.get(
  "/summary",
  getBankBookSummary
);

router.get(
  "/pdf",
  getBankBookPdf
);

module.exports = router;