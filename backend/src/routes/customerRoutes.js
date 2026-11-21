const express = require("express");

const {
  createCustomer,
  getCustomers,
  getCustomerById,
  updateCustomer,
  deleteCustomer,
} = require("../controllers/customerController");

const { protect } = require("../middleware/authMiddleware");

const router = express.Router();

router.use(protect);

router.post("/", createCustomer);

router.get("/", getCustomers);

router.get("/:id", getCustomerById);

router.put("/:id", updateCustomer);

router.delete("/:id", deleteCustomer);

module.exports = router;