const express = require("express");

const {
  createPurchaseReturn,
  getPurchaseReturns,
  getPurchaseReturnById,
  getPurchaseReturnPdf,
  deletePurchaseReturn,
} = require("../controllers/purchaseReturnController");

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
  createPurchaseReturn
);

/* =========================================================
   LIST
========================================================= */

router.get(
  "/",
  getPurchaseReturns
);

/* =========================================================
   PDF
   IMPORTANT:
   PDF route must come before /:id
========================================================= */

router.get(
  "/:id/pdf",
  getPurchaseReturnPdf
);

/* =========================================================
   GET BY ID
========================================================= */

router.get(
  "/:id",
  getPurchaseReturnById
);

/* =========================================================
   DELETE
========================================================= */

router.delete(
  "/:id",
  deletePurchaseReturn
);

module.exports = router;