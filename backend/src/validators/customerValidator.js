const { z } = require("zod");

const customerCreateSchema = z.object({
  companyId: z
    .string()
    .min(1, "Company ID is required"),

  branchId: z
    .string()
    .optional()
    .or(z.literal("")),

  customerCode: z
    .string()
    .trim()
    .max(30, "Customer code cannot exceed 30 characters")
    .optional()
    .default(""),

  name: z
    .string()
    .trim()
    .min(2, "Customer name must be at least 2 characters")
    .max(150, "Customer name cannot exceed 150 characters"),

  contactPerson: z
    .string()
    .trim()
    .max(100)
    .optional()
    .default(""),

  email: z
    .string()
    .trim()
    .email("Invalid email address")
    .optional()
    .or(z.literal("")),

  phone: z
    .string()
    .trim()
    .max(20)
    .optional()
    .default(""),

  alternatePhone: z
    .string()
    .trim()
    .max(20)
    .optional()
    .default(""),

  address: z
    .string()
    .trim()
    .max(500)
    .optional()
    .default(""),

  city: z
    .string()
    .trim()
    .max(100)
    .optional()
    .default(""),

  state: z
    .string()
    .trim()
    .max(100)
    .optional()
    .default(""),

  pincode: z
    .string()
    .trim()
    .max(10)
    .optional()
    .default(""),

  country: z
    .string()
    .trim()
    .max(100)
    .optional()
    .default("India"),

  gstNumber: z
    .string()
    .trim()
    .max(20)
    .optional()
    .default(""),

  panNumber: z
    .string()
    .trim()
    .max(20)
    .optional()
    .default(""),

  openingBalance: z
    .number()
    .min(0)
    .optional()
    .default(0),

  openingBalanceType: z
    .enum(["debit", "credit"])
    .optional()
    .default("debit"),

  creditLimit: z
    .number()
    .min(0)
    .optional()
    .default(0),

  creditDays: z
    .number()
    .int()
    .min(0)
    .optional()
    .default(0),

  isActive: z
    .boolean()
    .optional()
    .default(true),

  notes: z
    .string()
    .trim()
    .max(1000)
    .optional()
    .default(""),
});

const customerUpdateSchema = customerCreateSchema
  .omit({
    companyId: true,
  })
  .partial();

module.exports = {
  customerCreateSchema,
  customerUpdateSchema,
};