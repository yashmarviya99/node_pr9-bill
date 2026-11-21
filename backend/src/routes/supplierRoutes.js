const express = require("express");

const {
  createSupplier,
  getSuppliers,
  getSupplierById,
  updateSupplier,
  deleteSupplier,
} = require("../controllers/supplierController");

const {
  protect,
} = require("../middleware/authMiddleware");

const router = express.Router();

// Authentication required
router.use(protect);

// Create Supplier
router.post("/", createSupplier);

// Get all Suppliers
router.get("/", getSuppliers);

// Get single Supplier
router.get("/:id", getSupplierById);

// Update Supplier
router.put("/:id", updateSupplier);

// Delete Supplier
router.delete("/:id", deleteSupplier);

module.exports = router;