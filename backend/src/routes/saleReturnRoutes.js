const express = require("express");

const {
  createSaleReturn,
  getSaleReturns,
  getSaleReturnById,
  getSaleReturnPdf,
  deleteSaleReturn,
} = require("../controllers/saleReturnController");

const {
  protect,
} = require("../middleware/authMiddleware");

const router =
  express.Router();

router.use(protect);

/* =========================================================
   CREATE
========================================================= */

router.post(
  "/",
  createSaleReturn
);

/* =========================================================
   LIST
========================================================= */

router.get(
  "/",
  getSaleReturns
);

/* =========================================================
   PDF
   IMPORTANT:
   PDF route must come before /:id
========================================================= */

router.get(
  "/:id/pdf",
  getSaleReturnPdf
);

/* =========================================================
   GET BY ID
========================================================= */

router.get(
  "/:id",
  getSaleReturnById
);

/* =========================================================
   DELETE
========================================================= */

router.delete(
  "/:id",
  deleteSaleReturn
);

module.exports = router;