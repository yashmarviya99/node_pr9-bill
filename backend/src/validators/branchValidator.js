const { z } = require("zod");

const branchCreateSchema = z.object({
  companyId: z
    .string()
    .min(1, "Company ID is required"),

  name: z
    .string()
    .trim()
    .min(2, "Branch name must be at least 2 characters")
    .max(150, "Branch name cannot exceed 150 characters"),

  code: z
    .string()
    .trim()
    .min(1, "Branch code is required")
    .max(20, "Branch code cannot exceed 20 characters"),

  email: z
    .string()
    .trim()
    .email("Please provide a valid email")
    .optional()
    .or(z.literal("")),

  phone: z
    .string()
    .trim()
    .max(20, "Phone number cannot exceed 20 characters")
    .optional()
    .default(""),

  address: z
    .string()
    .trim()
    .max(500, "Address cannot exceed 500 characters")
    .optional()
    .default(""),

  city: z
    .string()
    .trim()
    .max(100, "City cannot exceed 100 characters")
    .optional()
    .default(""),

  state: z
    .string()
    .trim()
    .max(100, "State cannot exceed 100 characters")
    .optional()
    .default(""),

  pincode: z
    .string()
    .trim()
    .max(10, "Pincode cannot exceed 10 characters")
    .optional()
    .default(""),

  isMainBranch: z
    .boolean()
    .optional()
    .default(false),
});

const branchUpdateSchema = branchCreateSchema
  .omit({
    companyId: true,
  })
  .partial();

module.exports = {
  branchCreateSchema,
  branchUpdateSchema,
};