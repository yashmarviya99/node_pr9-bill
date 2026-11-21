const express = require("express");

const {
  createExpense,
  getExpenses,
  getExpenseById,
  updateExpense,
  deleteExpense,
} = require("../controllers/expenseController");

const {
  protect,
} = require("../middleware/authMiddleware");

const router = express.Router();

router.use(protect);

router.post(
  "/",
  createExpense
);

router.get(
  "/",
  getExpenses
);

router.get(
  "/:id",
  getExpenseById
);

router.put(
  "/:id",
  updateExpense
);

router.delete(
  "/:id",
  deleteExpense
);

module.exports = router;