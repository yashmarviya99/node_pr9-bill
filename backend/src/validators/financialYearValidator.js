const { z } = require("zod");

const financialYearCreateSchema = z.object({
  companyId: z
    .string()
    .min(1, "Company ID is required"),

  name: z
    .string()
    .trim()
    .min(4, "Financial year name is required")
    .max(20, "Financial year name cannot exceed 20 characters"),

  startDate: z
    .string()
    .date("Start date must be a valid date"),

  endDate: z
    .string()
    .date("End date must be a valid date"),

  isCurrent: z
    .boolean()
    .optional()
    .default(false),
});

const financialYearUpdateSchema =
  financialYearCreateSchema
    .omit({
      companyId: true,
    })
    .partial();

module.exports = {
  financialYearCreateSchema,
  financialYearUpdateSchema,
};