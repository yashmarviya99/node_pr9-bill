const express = require("express");

const {
  getLedgerSummary,
  getLedgerSummaryPdf,
  getLedgerDetails,
  getLedgerDetailsPdf,
} = require("../controllers/ledgerController");

const {
  protect,
} = require("../middleware/authMiddleware");

const router = express.Router();

/* =========================================================
   AUTHENTICATION
========================================================= */

router.use(protect);

/* =========================================================
   LEDGER SUMMARY
========================================================= */

router.get(
  "/summary",
  getLedgerSummary
);

router.get(
  "/summary/pdf",
  getLedgerSummaryPdf
);

/* =========================================================
   LEDGER DETAILS
========================================================= */

router.get(
  "/details",
  getLedgerDetails
);

router.get(
  "/details/pdf",
  getLedgerDetailsPdf
);

module.exports = router;