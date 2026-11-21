const { z } = require("zod");

const accountCreateSchema = z.object({
  companyId: z
    .string()
    .min(1, "Company ID is required"),

  branchId: z
    .string()
    .optional()
    .or(z.literal("")),

  accountCode: z
    .string()
    .trim()
    .max(
      30,
      "Account code cannot exceed 30 characters"
    )
    .optional()
    .default(""),

  name: z
    .string()
    .trim()
    .min(
      2,
      "Account name must be at least 2 characters"
    )
    .max(
      150,
      "Account name cannot exceed 150 characters"
    ),

  accountType: z.enum([
    "cash",
    "bank",
    "customer",
    "supplier",
    "income",
    "expense",
    "capital",
    "other",
  ]),

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

  address: z
    .string()
    .trim()
    .max(500)
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

  bankName: z
    .string()
    .trim()
    .max(150)
    .optional()
    .default(""),

  accountNumber: z
    .string()
    .trim()
    .max(50)
    .optional()
    .default(""),

  ifscCode: z
    .string()
    .trim()
    .max(20)
    .optional()
    .default(""),

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

const accountUpdateSchema = accountCreateSchema
  .omit({
    companyId: true,
  })
  .partial();

module.exports = {
  accountCreateSchema,
  accountUpdateSchema,
};