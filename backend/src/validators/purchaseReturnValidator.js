const { z } = require("zod");

const purchaseReturnItemSchema = z.object({
  productId: z
    .string()
    .min(1, "Product ID is required"),

  quantity: z
    .number()
    .positive("Return quantity must be greater than 0"),
});

const purchaseReturnCreateSchema = z.object({
  companyId: z
    .string()
    .min(1, "Company ID is required"),

  branchId: z
    .string()
    .optional()
    .or(z.literal("")),

  financialYearId: z
    .string()
    .min(1, "Financial year ID is required"),

  originalPurchaseId: z
    .string()
    .min(1, "Original purchase ID is required"),

  accountId: z
    .string()
    .min(1, "Supplier account ID is required"),

  supplierId: z
    .string()
    .optional()
    .or(z.literal("")),

  returnNumber: z
    .string()
    .trim()
    .min(1, "Return number is required")
    .max(50),

  returnDate: z
    .string()
    .min(1, "Return date is required"),

  items: z
    .array(purchaseReturnItemSchema)
    .min(1, "At least one return item is required"),

  roundOff: z
    .number()
    .optional()
    .default(0),

  adjustmentMode: z
    .enum([
      "none",
      "cash",
      "bank",
      "online",
      "supplier_credit",
    ])
    .optional()
    .default("none"),

  adjustmentAccountId: z
    .string()
    .optional()
    .or(z.literal("")),

  adjustmentAmount: z
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
  purchaseReturnCreateSchema,
};