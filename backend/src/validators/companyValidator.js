const { z } = require("zod");

const companyCreateSchema = z.object({
  companyName: z
    .string()
    .trim()
    .min(2, "Company name must be at least 2 characters")
    .max(150, "Company name cannot exceed 150 characters"),

  businessType: z
    .string()
    .trim()
    .max(100, "Business type cannot exceed 100 characters")
    .optional()
    .default(""),

  email: z
    .string()
    .trim()
    .email("Please provide a valid company email")
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

  country: z
    .string()
    .trim()
    .max(100, "Country cannot exceed 100 characters")
    .optional()
    .default("India"),

  gstNumber: z
    .string()
    .trim()
    .max(20, "GST number cannot exceed 20 characters")
    .optional()
    .default(""),

  panNumber: z
    .string()
    .trim()
    .max(20, "PAN number cannot exceed 20 characters")
    .optional()
    .default(""),

  website: z
    .string()
    .trim()
    .optional()
    .or(z.literal("")),

  logo: z
    .string()
    .trim()
    .optional()
    .default(""),

  financialYearStart: z
    .string()
    .trim()
    .regex(
      /^(0[1-9]|1[0-2])-(0[1-9]|[12][0-9]|3[01])$/,
      "Financial year start must be in MM-DD format"
    )
    .optional()
    .default("04-01"),
});

const companyUpdateSchema = companyCreateSchema.partial();

module.exports = {
  companyCreateSchema,
  companyUpdateSchema,
};