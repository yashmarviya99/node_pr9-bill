const { z } = require("zod");

const saleItemSchema = z.object({
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

const saleCreateSchema = z.object({
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

  challanId: z
    .string()
    .optional()
    .or(z.literal("")),

  invoiceDate: z
    .string()
    .min(1, "Invoice date is required"),

  invoiceType: z
    .enum(["sale", "retail", "tax"])
    .optional()
    .default("sale"),

  items: z
    .array(saleItemSchema)
    .min(1, "At least one product is required"),

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

  paymentMode: z
    .enum(["cash", "bank", "online", "credit"])
    .optional()
    .default("credit"),

  paymentAccountId: z
    .string()
    .optional()
    .or(z.literal("")),

  paymentAmount: z
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
  saleCreateSchema,
};