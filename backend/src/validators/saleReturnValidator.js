const { z } = require("zod");

const saleReturnItemSchema = z.object({
  productId: z
    .string()
    .min(
      1,
      "Product ID is required"
    ),

  quantity: z
    .number()
    .positive(
      "Return quantity must be greater than 0"
    ),
});

const saleReturnCreateSchema = z.object({
  companyId: z
    .string()
    .min(
      1,
      "Company ID is required"
    ),

  branchId: z
    .string()
    .optional()
    .or(z.literal("")),

  financialYearId: z
    .string()
    .min(
      1,
      "Financial Year ID is required"
    ),

  originalSaleId: z
    .string()
    .min(
      1,
      "Original sale ID is required"
    ),

  accountId: z
    .string()
    .min(
      1,
      "Customer account ID is required"
    ),

  customerId: z
    .string()
    .optional()
    .or(z.literal("")),

  returnNumber: z
    .string()
    .trim()
    .min(
      1,
      "Return number is required"
    )
    .max(
      50,
      "Return number cannot exceed 50 characters"
    ),

  returnDate: z
    .string()
    .min(
      1,
      "Return date is required"
    ),

  items: z
    .array(saleReturnItemSchema)
    .min(
      1,
      "At least one product is required"
    ),

  roundOff: z
    .number()
    .optional()
    .default(0),

  refundMode: z
    .enum([
      "none",
      "cash",
      "bank",
      "online",
    ])
    .optional()
    .default("none"),

  refundAccountId: z
    .string()
    .optional()
    .or(z.literal("")),

  refundAmount: z
    .number()
    .min(0)
    .optional()
    .default(0),

  narration: z
    .string()
    .trim()
    .max(1000)
    .optional()
    .default(""),

  termsAndConditions: z
    .string()
    .trim()
    .max(2000)
    .optional()
    .default(""),
});

module.exports = {
  saleReturnCreateSchema,
};