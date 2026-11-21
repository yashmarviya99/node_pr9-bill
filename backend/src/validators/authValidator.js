const { z } = require("zod");

const passwordSchema = z
  .string()
  .min(6, "Password must be at least 6 characters")
  .max(100, "Password cannot exceed 100 characters");

const registerSchema = z
  .object({
    name: z
      .string()
      .trim()
      .min(2, "Name must be at least 2 characters")
      .max(100, "Name cannot exceed 100 characters"),

    username: z
      .string()
      .trim()
      .min(3, "Username must be at least 3 characters")
      .max(50, "Username cannot exceed 50 characters"),

    email: z
      .string()
      .trim()
      .email("Please provide a valid email"),

    password: passwordSchema,

    confirmPassword: z.string(),

    // Optional business & company registration fields from PDF Page 1
    companyName: z.string().trim().optional().default(""),
    ownerName: z.string().trim().optional().default(""),
    branchName: z.string().trim().optional().default(""),
    mobileNumber: z.string().trim().optional().default(""),
    secondMobileNumber: z.string().trim().optional().default(""),
    gstNumber: z.string().trim().optional().default(""),
    businessType: z.string().trim().optional().default("retail"),
    businessOperation: z.string().trim().optional().default("sale"),
    state: z.string().trim().optional().default("Gujarat"),
    city: z.string().trim().optional().default("Rajkot"),
    address: z.string().trim().optional().default(""),
    paymentMethod: z.string().trim().optional().default("online"),
  })
  .refine(
    (data) =>
      data.password === data.confirmPassword,
    {
      message:
        "Password and confirm password do not match",
      path: ["confirmPassword"],
    }
  );

const loginSchema = z.object({
  username: z
    .string()
    .trim()
    .min(1, "Username is required"),

  password: z
    .string()
    .min(1, "Password is required"),
});

const adminRegisterSchema = z
  .object({
    verifierUsername: z
      .string()
      .trim()
      .optional()
      .default(""),

    verifierPassword: z
      .string()
      .optional()
      .default(""),

    email: z
      .string()
      .trim()
      .email("Please provide a valid email"),

    username: z
      .string()
      .trim()
      .min(
        3,
        "Admin username must be at least 3 characters"
      )
      .max(
        50,
        "Admin username cannot exceed 50 characters"
      ),

    password: passwordSchema,

    confirmPassword: z.string(),
  })
  .refine(
    (data) =>
      data.password === data.confirmPassword,
    {
      message:
        "Password and confirm password do not match",
      path: ["confirmPassword"],
    }
  );

module.exports = {
  registerSchema,
  loginSchema,
  adminRegisterSchema,
};
