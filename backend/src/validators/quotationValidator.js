const { z } = require("zod");

const quotationItemSchema = z.object({
  productId: z
    .string()
    .min(1, "Product ID is required"),

  quantity: z
    .number()
    .positive("Quantity must be greater than 0"),

  rate: z
    .number()
    .min(0, "Rate cannot be negative"),

  discountPercent: z
    .number()
    .min(0)
    .max(100)
    .optional()
    .default(0),

  gstRate: z
    .number()
    .min(0)
    .max(100)
    .optional(),

  description: z
    .string()
    .trim()
    .max(500)
    .optional()
    .default(""),
});

const quotationCreateSchema = z.object({
  companyId: z
    .string()
    .min(1, "Company ID is required"),

  branchId: z
    .string()
    .optional()
    .or(z.literal("")),

  financialYearId: z
    .string()
    .min(1, "Financial Year ID is required"),

  accountId: z
    .string()
    .min(1, "Account ID is required"),

  customerId: z
    .string()
    .optional()
    .or(z.literal("")),

  quotationNumber: z
    .string()
    .trim()
    .min(1, "Quotation number is required")
    .max(50),

  quotationDate: z
    .string()
    .min(1, "Quotation date is required"),

  validUntil: z
    .string()
    .optional()
    .or(z.literal("")),

  status: z
    .enum([
      "draft",
      "sent",
      "accepted",
      "rejected",
      "expired",
    ])
    .optional()
    .default("draft"),

  taxType: z
    .enum(["cgst_sgst", "igst"])
    .optional()
    .default("cgst_sgst"),

  items: z
    .array(quotationItemSchema)
    .min(
      1,
      "At least one quotation item is required"
    ),

  transportAmount: z
    .number()
    .min(0)
    .optional()
    .default(0),

  labourAmount: z
    .number()
    .min(0)
    .optional()
    .default(0),

  roundOff: z
    .number()
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

  notes: z
    .string()
    .trim()
    .max(2000)
    .optional()
    .default(""),
});

module.exports = {
  quotationCreateSchema,
};