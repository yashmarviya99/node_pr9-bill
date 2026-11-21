const { z } = require("zod");

const productCreateSchema = z.object({
  companyId: z
    .string()
    .min(1, "Company ID is required"),

  branchId: z
    .string()
    .optional()
    .or(z.literal("")),

  productCode: z
    .string()
    .trim()
    .max(
      30,
      "Product code cannot exceed 30 characters"
    )
    .optional()
    .default(""),

  name: z
    .string()
    .trim()
    .min(
      2,
      "Product name must be at least 2 characters"
    )
    .max(
      200,
      "Product name cannot exceed 200 characters"
    ),

  category: z
    .string()
    .trim()
    .max(100)
    .optional()
    .default(""),

  unit: z
    .string()
    .trim()
    .min(1, "Unit is required")
    .max(30)
    .default("PCS"),

  hsnSac: z
    .string()
    .trim()
    .max(20)
    .optional()
    .default(""),

  gstRate: z
    .number()
    .min(0, "GST rate cannot be negative")
    .max(100, "GST rate cannot exceed 100")
    .optional()
    .default(0),

  purchasePrice: z
    .number()
    .min(0, "Purchase price cannot be negative")
    .optional()
    .default(0),

  salePrice: z
    .number()
    .min(0, "Sale price cannot be negative")
    .optional()
    .default(0),

  openingStock: z
    .number()
    .min(0, "Opening stock cannot be negative")
    .optional()
    .default(0),

  minimumStock: z
    .number()
    .min(0, "Minimum stock cannot be negative")
    .optional()
    .default(0),

  description: z
    .string()
    .trim()
    .max(1000)
    .optional()
    .default(""),

  isActive: z
    .boolean()
    .optional()
    .default(true),
});

const productUpdateSchema = productCreateSchema
  .omit({
    companyId: true,
  })
  .partial();

module.exports = {
  productCreateSchema,
  productUpdateSchema,
};