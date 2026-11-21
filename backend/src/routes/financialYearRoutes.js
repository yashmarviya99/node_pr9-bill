const express = require("express");

const {
  createFinancialYear,
  getFinancialYears,
  getFinancialYearById,
  updateFinancialYear,
  deleteFinancialYear,
} = require("../controllers/financialYearController");

const { protect } = require("../middleware/authMiddleware");

const router = express.Router();

router.use(protect);

router.post("/", createFinancialYear);

router.get("/", getFinancialYears);

router.get("/:id", getFinancialYearById);

router.put("/:id", updateFinancialYear);

router.delete("/:id", deleteFinancialYear);

module.exports = router;