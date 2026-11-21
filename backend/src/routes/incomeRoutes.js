const express = require("express");

const {
  createIncome,
  getIncomes,
  getIncomeById,
  updateIncome,
  deleteIncome,
} = require("../controllers/incomeController");

const {
  protect,
} = require("../middleware/authMiddleware");

const router = express.Router();

router.use(protect);

router.post(
  "/",
  createIncome
);

router.get(
  "/",
  getIncomes
);

router.get(
  "/:id",
  getIncomeById
);

router.put(
  "/:id",
  updateIncome
);

router.delete(
  "/:id",
  deleteIncome
);

module.exports = router;