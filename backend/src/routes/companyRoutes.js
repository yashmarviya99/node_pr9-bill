const express = require("express");

const {
  setupCompany,
  createCompany,
  getCompanies,
  getCompanyById,
  updateCompany,
  deleteCompany,
} = require("../controllers/companyController");

const {
  protect,
} = require("../middleware/authMiddleware");

const router =
  express.Router();

/*
|--------------------------------------------------------------------------
| All Company APIs require authentication
|--------------------------------------------------------------------------
*/

router.use(protect);

/*
|--------------------------------------------------------------------------
| Registration Company Setup
|--------------------------------------------------------------------------
|
| Creates:
| - Company
| - Main Branch
| - Current Financial Year
|
| Payment must already be verified.
|
|--------------------------------------------------------------------------
*/

router.post(
  "/setup",
  setupCompany
);

/*
|--------------------------------------------------------------------------
| Normal Company APIs
|--------------------------------------------------------------------------
*/

router.post(
  "/",
  createCompany
);

router.get(
  "/",
  getCompanies
);

router.get(
  "/:id",
  getCompanyById
);

router.put(
  "/:id",
  updateCompany
);

router.delete(
  "/:id",
  deleteCompany
);

module.exports = router;