const express = require("express");

const {
  getCashBook,
  getCashBookSummary,
  getCashBookPdf,
} = require("../controllers/cashBookController");

const { protect } = require("../middleware/authMiddleware");

const router = express.Router();

router.use(protect);

router.get("/", getCashBook);
router.get("/summary", getCashBookSummary);
router.get("/pdf", getCashBookPdf);

module.exports = router;