const express = require("express");

const {
  createChallan,
  getChallans,
  getChallanById,
  getChallanPdf,
  deleteChallan,
} = require("../controllers/challanController");

const {
  protect,
} = require("../middleware/authMiddleware");

const router =
  express.Router();

router.use(protect);

/* =========================================================
   CREATE CHALLAN
========================================================= */

router.post(
  "/",
  createChallan
);

/* =========================================================
   GET CHALLANS
========================================================= */

router.get(
  "/",
  getChallans
);

/* =========================================================
   GET CHALLAN PDF

   IMPORTANT:
   This route must be BEFORE /:id
========================================================= */

router.get(
  "/:id/pdf",
  getChallanPdf
);

/* =========================================================
   GET CHALLAN BY ID
========================================================= */

router.get(
  "/:id",
  getChallanById
);

/* =========================================================
   DELETE CHALLAN
========================================================= */

router.delete(
  "/:id",
  deleteChallan
);

module.exports = router;