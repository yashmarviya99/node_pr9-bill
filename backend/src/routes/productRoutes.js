const express = require("express");

const {
  createProduct,
  getProducts,
  getProductById,
  updateProduct,
  deleteProduct,
} = require("../controllers/productController");

const {
  protect,
} = require("../middleware/authMiddleware");

const router = express.Router();

// Authentication required
router.use(protect);

// Create Product
router.post("/", createProduct);

// Get all Products
router.get("/", getProducts);

// Get single Product
router.get("/:id", getProductById);

// Update Product
router.put("/:id", updateProduct);

// Delete Product
router.delete("/:id", deleteProduct);

module.exports = router;