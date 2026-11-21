const express = require("express");

const {
  getSalesReport,
  getPurchaseReport,
} = require("../controllers/reportController");

const {
  getStockReport,
} = require("../controllers/stockReportController");

const {
  getReceivableOutstanding,
} = require("../controllers/receivableOutstandingController");

const {
  getPayableOutstanding,
} = require("../controllers/payableOutstandingController");

const {
  getGstReport,
} = require("../controllers/gstReportController");

const {
  protect,
} = require("../middleware/authMiddleware");

const router = express.Router();

router.use(protect);

router.get(
  "/sales",
  getSalesReport
);

router.get(
  "/purchases",
  getPurchaseReport
);

router.get(
  "/stock",
  getStockReport
);

router.get(
  "/receivable-outstanding",
  getReceivableOutstanding
);

router.get(
  "/payable-outstanding",
  getPayableOutstanding
);

router.get(
  "/gst",
  getGstReport
);

module.exports = router;