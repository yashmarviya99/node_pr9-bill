const { z } = require("zod");

const challanItemSchema = z.object({
  productId: z
    .string()
    .min(1, "Product ID is required"),

  quantity: z
    .number()
    .positive(
      "Quantity must be greater than 0"
    ),

  rate: z
    .number()
    .min(0)
    .optional()
    .default(0),
});

const challanCreateSchema = z.object({
  companyId: z
    .string()
    .min(1, "Company ID is required"),

  branchId: z
    .string()
    .optional()
    .or(z.literal("")),

  financialYearId: z
    .string()
    .min(
      1,
      "Financial year ID is required"
    ),

  accountId: z
    .string()
    .min(1, "Account ID is required"),

  customerId: z
    .string()
    .optional()
    .or(z.literal("")),

  challanNumber: z
    .string()
    .trim()
    .min(1, "Challan number is required")
    .max(50),

  challanDate: z
    .string()
    .min(1, "Challan date is required"),

  challanType: z
    .enum([
      "delivery",
      "returnable",
      "job_work",
    ])
    .optional()
    .default("delivery"),

  referenceNumber: z
    .string()
    .trim()
    .max(100)
    .optional()
    .default(""),

  vehicleNumber: z
    .string()
    .trim()
    .max(30)
    .optional()
    .default(""),

  transporterName: z
    .string()
    .trim()
    .max(150)
    .optional()
    .default(""),

  eWayBillNumber: z
    .string()
    .trim()
    .max(100)
    .optional()
    .default(""),

  items: z
    .array(challanItemSchema)
    .min(
      1,
      "At least one challan item is required"
    ),

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
  challanCreateSchema,
};