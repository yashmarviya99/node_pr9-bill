const express = require("express");
const {
  getInvoiceSettings,
  saveInvoiceSettings,
  completeFinancialYearAndCarryForward,
} = require("../controllers/settingController");
const { protect } = require("../middleware/authMiddleware");

const router = express.Router();

router.use(protect);

router.get("/invoice-settings", getInvoiceSettings);
router.post("/invoice-settings", saveInvoiceSettings);
router.post("/close-financial-year", completeFinancialYearAndCarryForward);

module.exports = router;
