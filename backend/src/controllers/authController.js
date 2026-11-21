const bcrypt = require("bcryptjs");

const User = require("../models/User");
const Company = require("../models/Company");
const Branch = require("../models/Branch");
const FinancialYear = require("../models/FinancialYear");

const {
  registerSchema,
  loginSchema,
  adminRegisterSchema,
} = require("../validators/authValidator");

const {
  generateAccessToken,
  generateRefreshToken,
} = require("../utils/token");

const { sendOtpEmail } = require("../utils/email");

// --- OTP helpers -------------------------------------------------------------
const OTP_EXPIRY_MS = 10 * 60 * 1000; // 10 minutes
const MAX_OTP_ATTEMPTS = 5;
const generateOtp = () => String(Math.floor(100000 + Math.random() * 900000));

const isProduction =
  process.env.NODE_ENV ===
  "production";

const REGISTRATION_PAYMENT_AMOUNT =
  Number(
    process.env.REGISTRATION_PAYMENT_AMOUNT ||
      999
  );

const getCookieSameSite = () => {
  const sameSite =
    String(
      process.env.COOKIE_SAME_SITE ||
        (isProduction
          ? "none"
          : "lax")
    ).toLowerCase();

  if (
    ![
      "strict",
      "lax",
      "none",
    ].includes(sameSite)
  ) {
    return isProduction
      ? "none"
      : "lax";
  }

  return sameSite;
};

const baseCookieOptions = {
  httpOnly: true,
  secure: isProduction,
  sameSite:
    getCookieSameSite(),
  path: "/",
};

const setAuthCookies = (
  res,
  user
) => {
  const accessToken =
    generateAccessToken(user);

  const refreshToken =
    generateRefreshToken(user);

  res.cookie(
    "accessToken",
    accessToken,
    {
      ...baseCookieOptions,
      maxAge:
        15 * 60 * 1000,
    }
  );

  res.cookie(
    "refreshToken",
    refreshToken,
    {
      ...baseCookieOptions,
      maxAge:
        7 *
        24 *
        60 *
        60 *
        1000,
    }
  );
};

const getNextStep = (
  user
) => {
  if (
    user.role ===
    "admin"
  ) {
    return "admin-dashboard";
  }

  if (
    user.paymentStatus ===
      "verified" &&
    user.registrationStatus ===
      "active" &&
    user.subscriptionStatus ===
      "active" &&
    user.isActive
  ) {
    return "company-select";
  }

  return "payment";
};

const buildUserResponse = (
  user
) => ({
  id: user._id,
  name: user.name,
  username:
    user.username,
  email:
    user.email,
  role:
    user.role,
  isActive:
    user.isActive,
  isSuspended:
    user.isSuspended,
  registrationStatus:
    user.registrationStatus,
  paymentStatus:
    user.paymentStatus,
  subscriptionStatus:
    user.subscriptionStatus,
});

const sendAuthResponse = (
  res,
  user,
  statusCode,
  message
) => {
  setAuthCookies(
    res,
    user
  );

  return res
    .status(statusCode)
    .json({
      success: true,
      message,
      nextStep:
        getNextStep(user),
      user:
        buildUserResponse(user),
    });
};

const register = async (
  req,
  res,
  next
) => {
  try {
    const validatedData =
      registerSchema.parse(
        req.body
      );

    const {
      name,
      username,
      email,
      password,
    } = validatedData;

    const normalizedUsername =
      username
        .trim()
        .toLowerCase();

    const normalizedEmail =
      email
        .trim()
        .toLowerCase();

    const existingUsername =
      await User.findOne({
        username:
          normalizedUsername,
      });

    if (
      existingUsername
    ) {
      return res.status(409).json({
        success: false,
        message:
          "Username already exists",
      });
    }

    const existingEmail =
      await User.findOne({
        email:
          normalizedEmail,
      });

    if (existingEmail) {
      return res.status(409).json({
        success: false,
        message:
          "User with this email already exists",
      });
    }

    const hashedPassword =
      await bcrypt.hash(
        password,
        12
      );

    const {
      ownerName = "",
      mobileNumber = "",
      secondMobileNumber = "",
      companyName = "",
      branchName = "",
      gstNumber = "",
      businessType = "retail",
      state = "Gujarat",
      city = "Rajkot",
      address = "",
      paymentMethod = "online",
    } = validatedData;

    const user =
      await User.create({
        name:
          name.trim(),

        ownerName:
          ownerName.trim(),

        username:
          normalizedUsername,

        email:
          normalizedEmail,

        password:
          hashedPassword,

        mobileNumber:
          mobileNumber.trim(),

        secondMobileNumber:
          secondMobileNumber.trim(),

        role: "user",

        isActive:
          false,

        isSuspended:
          false,

        registrationStatus:
          "pending_payment",

        paymentStatus:
          "pending",

        subscriptionStatus:
          "pending",

        registrationPaymentMethod:
          paymentMethod,
      });

    // Auto-create Company, Branch and Financial Year if companyName is provided
    if (companyName && companyName.trim()) {
      try {
        const company = await Company.create({
          owner: user._id,
          companyName: companyName.trim(),
          businessType: businessType || "Retail",
          gstNumber: gstNumber ? gstNumber.trim().toUpperCase() : "",
          phone: mobileNumber.trim(),
          email: normalizedEmail,
          address: address.trim(),
          city: city.trim() || "Rajkot",
          state: state.trim() || "Gujarat",
          country: "India",
        });

        await Branch.create({
          company: company._id,
          name: branchName && branchName.trim() ? branchName.trim() : `${company.companyName} Main Branch`,
          code: "MAIN",
          phone: mobileNumber.trim(),
          email: normalizedEmail,
          address: address.trim(),
          city: city.trim() || "Rajkot",
          state: state.trim() || "Gujarat",
          isMainBranch: true,
          isActive: true,
        });

        const now = new Date();
        const currentYear = now.getUTCFullYear();
        const currentMonth = now.getUTCMonth();
        const startYear = currentMonth >= 3 ? currentYear : currentYear - 1;
        const endYear = startYear + 1;
        const fyName = `FY ${startYear}-${String(endYear).slice(-2)}`;
        const startDate = new Date(Date.UTC(startYear, 3, 1, 0, 0, 0, 0));
        const endDate = new Date(Date.UTC(endYear, 2, 31, 23, 59, 59, 999));

        await FinancialYear.create({
          company: company._id,
          name: fyName,
          startDate,
          endDate,
          isCurrent: true,
          isActive: true,
        });
      } catch (compErr) {
        console.error("Auto company creation error:", compErr.message);
      }
    }

    return res
      .status(201)
      .json({
        success: true,

        message:
          "Account created successfully. Please login and complete the registration payment.",

        user:
          buildUserResponse(
            user
          ),

        nextStep:
          "payment",
      });
  } catch (error) {
    next(error);
  }
};

const adminRegister = async (
  req,
  res,
  next
) => {
  try {
    const adminCount =
      await User.countDocuments({
        role: "admin",
      });

    const {
      verifierUsername,
      verifierPassword,
      email,
      username,
      password,
    } = adminRegisterSchema.parse(
      adminCount === 0
        ? {
            verifierUsername: "",
            verifierPassword: "",
            ...req.body,
          }
        : req.body
    );

    if (adminCount > 0) {
      const normalizedVerifierUsername =
        verifierUsername
          .trim()
          .toLowerCase();

      const verifier =
        await User.findOne({
          username:
            normalizedVerifierUsername,
          role: "admin",
        }).select("+password");

      if (!verifier) {
        return res.status(401).json({
          success: false,
          message:
            "Existing admin username or password is invalid",
        });
      }

      const verifierPasswordCorrect =
        await bcrypt.compare(
          verifierPassword,
          verifier.password
        );

      if (!verifierPasswordCorrect) {
        return res.status(401).json({
          success: false,
          message:
            "Existing admin username or password is invalid",
        });
      }

      if (
        verifier.isSuspended ||
        !verifier.isActive
      ) {
        return res.status(403).json({
          success: false,
          message:
            "Existing admin account is not active",
        });
      }
    }

    const normalizedUsername =
      username
        .trim()
        .toLowerCase();

    const normalizedEmail =
      email
        .trim()
        .toLowerCase();

    const existingUsername =
      await User.findOne({
        username:
          normalizedUsername,
      });

    if (existingUsername) {
      return res.status(409).json({
        success: false,
        message:
          "Username already exists",
      });
    }

    const existingEmail =
      await User.findOne({
        email:
          normalizedEmail,
      });

    if (existingEmail) {
      return res.status(409).json({
        success: false,
        message:
          "User with this email already exists",
      });
    }

    const hashedPassword =
      await bcrypt.hash(
        password,
        12
      );

    const admin =
      await User.create({
        name: "",
        ownerName: "",
        username:
          normalizedUsername,
        email:
          normalizedEmail,
        password:
          hashedPassword,
        mobileNumber: "",
        secondMobileNumber: "",
        role: "admin",
        isActive: true,
        isSuspended: false,
        registrationStatus:
          "active",
        paymentStatus:
          "verified",
        subscriptionStatus:
          "active",
        registrationPaymentMethod:
          "online",
      });

    return res
      .status(201)
      .json({
        success: true,

        message:
          adminCount === 0
            ? "First admin created successfully"
            : "Admin created successfully",

        user:
          buildUserResponse(
            admin
          ),

        firstAdmin:
          adminCount === 0,
      });
  } catch (error) {
    next(error);
  }
};

const login = async (
  req,
  res,
  next
) => {
  try {
    const validatedData =
      loginSchema.parse(
        req.body
      );

    const {
      username,
      password,
    } = validatedData;

    const normalizedUsername =
      username
        .trim()
        .toLowerCase();

    const user =
      await User.findOne({
        username:
          normalizedUsername,
      }).select("+password");

    if (!user) {
      return res.status(401).json({
        success: false,
        message:
          "Invalid username or password",
      });
    }

    const isPasswordCorrect =
      await bcrypt.compare(
        password,
        user.password
      );

    if (
      !isPasswordCorrect
    ) {
      return res.status(401).json({
        success: false,
        message:
          "Invalid username or password",
      });
    }

    if (user.isSuspended) {
      return res.status(403).json({
        success: false,
        message:
          "Your account is suspended",
      });
    }

    return sendAuthResponse(
      res,
      user,
      200,
      user.isActive
        ? "Login successful"
        : "Login successful. Please complete your registration payment."
    );
  } catch (error) {
    next(error);
  }
};

const adminLogin = async (
  req,
  res,
  next
) => {
  try {
    const validatedData =
      loginSchema.parse(
        req.body
      );

    const {
      username,
      password,
    } = validatedData;

    const normalizedUsername =
      username
        .trim()
        .toLowerCase();

    const admin =
      await User.findOne({
        username:
          normalizedUsername,
        role: "admin",
      }).select("+password");

    if (!admin) {
      return res.status(401).json({
        success: false,
        message:
          "Invalid admin username or password",
      });
    }

    const isPasswordCorrect =
      await bcrypt.compare(
        password,
        admin.password
      );

    if (!isPasswordCorrect) {
      return res.status(401).json({
        success: false,
        message:
          "Invalid admin username or password",
      });
    }

    if (admin.isSuspended) {
      return res.status(403).json({
        success: false,
        message:
          "Your admin account is suspended",
      });
    }

    if (!admin.isActive) {
      return res.status(403).json({
        success: false,
        message:
          "Your admin account is inactive",
      });
    }

    return sendAuthResponse(
      res,
      admin,
      200,
      "Admin login successful"
    );
  } catch (error) {
    next(error);
  }
};

const getRegistrationPaymentStatus =
  async (
    req,
    res,
    next
  ) => {
    try {
      const user =
        await User.findById(
          req.user.userId
        )
          .select(
            "_id username email isActive isSuspended registrationStatus paymentStatus subscriptionStatus registrationPaymentMethod registrationPaymentAmount registrationPaymentReference registrationPaymentSubmittedAt registrationPaymentVerifiedAt"
          )
          .lean();

      if (!user) {
        return res.status(404).json({
          success: false,
          message:
            "User not found",
        });
      }

      return res
        .status(200)
        .json({
          success: true,

          payment: {
            amount:
              REGISTRATION_PAYMENT_AMOUNT,

            submittedAmount:
              user.registrationPaymentAmount ||
              0,

            paymentMethod:
              user.registrationPaymentMethod,

            reference:
              user.registrationPaymentReference,

            submittedAt:
              user.registrationPaymentSubmittedAt,

            verifiedAt:
              user.registrationPaymentVerifiedAt,

            status:
              user.paymentStatus,

            registrationStatus:
              user.registrationStatus,

            subscriptionStatus:
              user.subscriptionStatus,

            isActive:
              user.isActive,
          },
        });
    } catch (error) {
      next(error);
    }
  };

const submitRegistrationPayment =
  async (
    req,
    res,
    next
  ) => {
    try {
      const {
        paymentMethod,
        amount,
        transactionReference,
      } = req.body;

      const allowedMethods = [
        "online",
        "card",
        "bank_transfer",
        "upi",
        "other",
      ];

      if (
        !allowedMethods.includes(
          paymentMethod
        )
      ) {
        return res.status(400).json({
          success: false,
          message:
            "Invalid payment method",
        });
      }

      if (
        !transactionReference ||
        !String(
          transactionReference
        ).trim()
      ) {
        return res.status(400).json({
          success: false,
          message:
            "Transaction reference is required",
        });
      }

      const submittedAmount =
        Number(amount);

      if (
        !Number.isFinite(
          submittedAmount
        ) ||
        submittedAmount <= 0
      ) {
        return res.status(400).json({
          success: false,
          message:
            "Payment amount must be greater than 0",
        });
      }

      if (
        submittedAmount !==
        REGISTRATION_PAYMENT_AMOUNT
      ) {
        return res.status(400).json({
          success: false,
          message: `Registration payment amount must be ₹${REGISTRATION_PAYMENT_AMOUNT}`,
        });
      }

      const user =
        await User.findById(
          req.user.userId
        );

      if (!user) {
        return res.status(404).json({
          success: false,
          message:
            "User not found",
        });
      }

      if (
        user.role !==
        "user"
      ) {
        return res.status(400).json({
          success: false,
          message:
            "Registration payment is only for business users",
        });
      }

      if (
        user.isActive &&
        user.paymentStatus ===
          "verified"
      ) {
        return res.status(409).json({
          success: false,
          message:
            "Your registration payment is already verified",
        });
      }

      if (
        user.paymentStatus ===
        "submitted"
      ) {
        return res.status(409).json({
          success: false,
          message:
            "Your payment is already submitted and waiting for admin verification",
        });
      }

      user.registrationPaymentMethod =
        paymentMethod;

      user.registrationPaymentAmount =
        submittedAmount;

      user.registrationPaymentReference =
        String(
          transactionReference
        ).trim();

      user.registrationPaymentSubmittedAt =
        new Date();

      user.registrationPaymentVerifiedAt =
        null;

      user.registrationPaymentRejectedAt =
        null;

      user.paymentStatus =
        "submitted";

      user.registrationStatus =
        "payment_pending_verification";

      user.subscriptionStatus =
        "pending";

      user.isActive =
        false;

      await user.save();

      return res
        .status(200)
        .json({
          success: true,

          message:
            "Payment submitted successfully. Please wait for admin verification.",

          nextStep:
            "payment-pending",

          payment: {
            amount:
              submittedAmount,

            paymentMethod,

            reference:
              user.registrationPaymentReference,

            status:
              user.paymentStatus,

            registrationStatus:
              user.registrationStatus,
          },
        });
    } catch (error) {
      next(error);
    }
  };

const getPendingRegistrationPayments =
  async (
    req,
    res,
    next
  ) => {
    try {
      const users =
        await User.find({
          role: "user",
          paymentStatus:
            "submitted",
          registrationStatus:
            "payment_pending_verification",
        })
          .select(
            "_id name username email registrationPaymentMethod registrationPaymentAmount registrationPaymentReference registrationPaymentSubmittedAt paymentStatus registrationStatus subscriptionStatus"
          )
          .sort({
            registrationPaymentSubmittedAt: 1,
          })
          .lean();

      return res
        .status(200)
        .json({
          success: true,
          count:
            users.length,
          payments:
            users,
        });
    } catch (error) {
      next(error);
    }
  };

const verifyRegistrationPayment =
  async (
    req,
    res,
    next
  ) => {
    try {
      const {
        userId,
      } = req.params;

      const user =
        await User.findById(
          userId
        );

      if (!user) {
        return res.status(404).json({
          success: false,
          message:
            "User not found",
        });
      }

      if (
        user.role !==
        "user"
      ) {
        return res.status(400).json({
          success: false,
          message:
            "Only business user registrations can be verified",
        });
      }

      if (
        user.paymentStatus !==
        "submitted"
      ) {
        return res.status(400).json({
          success: false,
          message:
            "Only submitted payments can be verified",
        });
      }

      user.paymentStatus =
        "verified";

      user.registrationStatus =
        "active";

      user.subscriptionStatus =
        "active";

      user.isActive =
        true;

      user.isSuspended =
        false;

      user.registrationPaymentVerifiedAt =
        new Date();

      user.subscriptionStartDate =
        new Date();

      await user.save();

      return res
        .status(200)
        .json({
          success: true,

          message:
            "Registration payment verified successfully",

          nextStep:
            "company-select",

          user:
            buildUserResponse(
              user
            ),
        });
    } catch (error) {
      next(error);
    }
  };

const rejectRegistrationPayment =
  async (
    req,
    res,
    next
  ) => {
    try {
      const {
        userId,
      } = req.params;

      const {
        reason =
          "Payment rejected by admin",
      } =
        req.body || {};

      const user =
        await User.findById(
          userId
        );

      if (!user) {
        return res.status(404).json({
          success: false,
          message:
            "User not found",
        });
      }

      if (
        user.paymentStatus !==
        "submitted"
      ) {
        return res.status(400).json({
          success: false,
          message:
            "Only submitted payments can be rejected",
        });
      }

      user.paymentStatus =
        "failed";

      user.registrationStatus =
        "rejected";

      user.subscriptionStatus =
        "pending";

      user.isActive =
        false;

      user.registrationPaymentRejectedAt =
        new Date();

      await user.save();

      return res
        .status(200)
        .json({
          success: true,

          message:
            reason,

          nextStep:
            "payment",

          user:
            buildUserResponse(
              user
            ),
        });
    } catch (error) {
      next(error);
    }
  };

const logout = async (
  req,
  res,
  next
) => {
  try {
    res.clearCookie(
      "accessToken",
      baseCookieOptions
    );

    res.clearCookie(
      "refreshToken",
      baseCookieOptions
    );

    return res
      .status(200)
      .json({
        success: true,
        message:
          "Logout successful",
      });
  } catch (error) {
    next(error);
  }
};

const getMe = async (
  req,
  res,
  next
) => {
  try {
    const user =
      await User.findById(
        req.user.userId
      )
        .select(
          "_id name username email role isActive isSuspended registrationStatus paymentStatus subscriptionStatus createdAt updatedAt"
        )
        .lean();

    if (!user) {
      return res.status(404).json({
        success: false,
        message:
          "User not found",
      });
    }

    return res
      .status(200)
      .json({
        success: true,

        user: {
          id: user._id,

          name:
            user.name,

          username:
            user.username,

          email:
            user.email,

          role:
            user.role,

          isActive:
            user.isActive,

          isSuspended:
            user.isSuspended,

          registrationStatus:
            user.registrationStatus,

          paymentStatus:
            user.paymentStatus,

          subscriptionStatus:
            user.subscriptionStatus,

          createdAt:
            user.createdAt,

          updatedAt:
            user.updatedAt,
        },
      });
  } catch (error) {
    next(error);
  }
};


// --- Forgot Password: Request OTP --------------------------------------------
const forgotPassword = async (req, res, next) => {
  try {
    const { email } = req.body;

    if (!email || !String(email).trim()) {
      return res.status(400).json({
        success: false,
        message: "Email address is required",
      });
    }

    const normalizedEmail = String(email).trim().toLowerCase();

    // Always respond with success to avoid user enumeration
    const user = await User.findOne({ email: normalizedEmail }).select(
      "+resetOtp +resetOtpExpiry +resetOtpAttempts"
    );

    if (!user) {
      return res.status(200).json({
        success: true,
        message:
          "If this email is registered, an OTP has been sent to it.",
      });
    }

    const otp = generateOtp();
    const hashedOtp = await bcrypt.hash(otp, 10);

    user.resetOtp = hashedOtp;
    user.resetOtpExpiry = new Date(Date.now() + OTP_EXPIRY_MS);
    user.resetOtpAttempts = 0;
    await user.save();

    try {
      await sendOtpEmail(normalizedEmail, otp, user.name || user.username);
    } catch (mailErr) {
      // Don't expose mail error to client but log it
      console.error("OTP mail error:", mailErr.message);
    }

    return res.status(200).json({
      success: true,
      message:
        "If this email is registered, an OTP has been sent to it.",
    });
  } catch (error) {
    next(error);
  }
};

// --- Verify OTP --------------------------------------------------------------
const verifyOtp = async (req, res, next) => {
  try {
    const { email, otp } = req.body;

    if (!email || !otp) {
      return res.status(400).json({
        success: false,
        message: "Email and OTP are required",
      });
    }

    const normalizedEmail = String(email).trim().toLowerCase();

    const user = await User.findOne({ email: normalizedEmail }).select(
      "+resetOtp +resetOtpExpiry +resetOtpAttempts"
    );

    if (!user || !user.resetOtp || !user.resetOtpExpiry) {
      return res.status(400).json({
        success: false,
        message: "Invalid or expired OTP. Please request a new one.",
      });
    }

    if (new Date() > user.resetOtpExpiry) {
      user.resetOtp = null;
      user.resetOtpExpiry = null;
      user.resetOtpAttempts = 0;
      await user.save();
      return res.status(400).json({
        success: false,
        message: "OTP has expired. Please request a new one.",
      });
    }

    if (user.resetOtpAttempts >= MAX_OTP_ATTEMPTS) {
      return res.status(429).json({
        success: false,
        message:
          "Too many failed attempts. Please request a new OTP.",
      });
    }

    const isMatch = await bcrypt.compare(String(otp).trim(), user.resetOtp);

    if (!isMatch) {
      user.resetOtpAttempts = (user.resetOtpAttempts || 0) + 1;
      await user.save();
      const remaining = MAX_OTP_ATTEMPTS - user.resetOtpAttempts;
      return res.status(400).json({
        success: false,
        message: `Incorrect OTP. ${remaining} attempt(s) remaining.`,
      });
    }

    // OTP valid � issue a short-lived reset token (store as hashed OTP with different flag)
    // We reuse resetOtp field as a "verified" marker, expiry kept alive for reset step
    user.resetOtpAttempts = -1; // -1 = verified
    await user.save();

    return res.status(200).json({
      success: true,
      message: "OTP verified successfully.",
      email: normalizedEmail,
    });
  } catch (error) {
    next(error);
  }
};

// --- Reset Password -----------------------------------------------------------
const resetPassword = async (req, res, next) => {
  try {
    const { email, otp, newPassword } = req.body;

    if (!email || !otp || !newPassword) {
      return res.status(400).json({
        success: false,
        message: "Email, OTP and new password are required",
      });
    }

    if (String(newPassword).length < 6) {
      return res.status(400).json({
        success: false,
        message: "Password must be at least 6 characters",
      });
    }

    const normalizedEmail = String(email).trim().toLowerCase();

    const user = await User.findOne({ email: normalizedEmail }).select(
      "+password +resetOtp +resetOtpExpiry +resetOtpAttempts"
    );

    if (!user || !user.resetOtp || !user.resetOtpExpiry) {
      return res.status(400).json({
        success: false,
        message: "Invalid or expired OTP. Please start over.",
      });
    }

    if (new Date() > user.resetOtpExpiry) {
      user.resetOtp = null;
      user.resetOtpExpiry = null;
      user.resetOtpAttempts = 0;
      await user.save();
      return res.status(400).json({
        success: false,
        message: "OTP has expired. Please request a new one.",
      });
    }

    if (user.resetOtpAttempts !== -1) {
      // OTP was not verified in the previous step � verify now
      if (user.resetOtpAttempts >= MAX_OTP_ATTEMPTS) {
        return res.status(429).json({
          success: false,
          message: "Too many failed attempts. Please request a new OTP.",
        });
      }
      const isMatch = await bcrypt.compare(String(otp).trim(), user.resetOtp);
      if (!isMatch) {
        user.resetOtpAttempts = (user.resetOtpAttempts || 0) + 1;
        await user.save();
        return res.status(400).json({
          success: false,
          message: "Incorrect OTP.",
        });
      }
    }

    // All good � update password
    const hashed = await bcrypt.hash(String(newPassword), 12);
    user.password = hashed;
    user.resetOtp = null;
    user.resetOtpExpiry = null;
    user.resetOtpAttempts = 0;
    await user.save();

    return res.status(200).json({
      success: true,
      message:
        "Password reset successfully. You can now log in with your new password.",
    });
  } catch (error) {
    next(error);
  }
};
module.exports = {
  forgotPassword,
  verifyOtp,
  resetPassword,
  register,
  adminRegister,
  login,
  adminLogin,
  logout,
  getMe,
  getRegistrationPaymentStatus,
  submitRegistrationPayment,
  verifyRegistrationPayment,
  rejectRegistrationPayment,
  getPendingRegistrationPayments,
};