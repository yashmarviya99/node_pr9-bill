const mongoose = require("mongoose");

const Payment = require("../models/Payment");
const Account = require("../models/Account");
const Company = require("../models/Company");
const FinancialYear = require("../models/FinancialYear");

const round2 = (value) => {
  return Math.round((Number(value) + Number.EPSILON) * 100) / 100;
};

const checkCompanyAccess = async (companyId, userId) => {
  if (!companyId || !mongoose.Types.ObjectId.isValid(companyId)) {
    return null;
  }

  const company = await Company.findOne({
    _id: companyId,
    owner: userId,
  });

  return company;
};

const getFinancialYear = async (financialYearId, companyId) => {
  if (
    !financialYearId ||
    !mongoose.Types.ObjectId.isValid(financialYearId)
  ) {
    return null;
  }

  return FinancialYear.findOne({
    _id: financialYearId,
    company: companyId,
  });
};

/*
|--------------------------------------------------------------------------
| CREATE PAYMENT
|--------------------------------------------------------------------------
*/
const createPayment = async (req, res) => {
  try {
    const {
      companyId,
      branchId,
      financialYearId,
      accountId,
      paymentAccountId,
      paymentNumber,
      paymentDate,
      amount,
      paymentMode,
      chequeNumber,
      chequeDate,
      bankName,
      referenceNumber,
      narration,
      notes,
    } = req.body;

    if (!companyId) {
      return res.status(400).json({
        success: false,
        message: "companyId is required",
      });
    }

    if (!financialYearId) {
      return res.status(400).json({
        success: false,
        message: "financialYearId is required",
      });
    }

    if (!accountId) {
      return res.status(400).json({
        success: false,
        message: "accountId is required",
      });
    }

    if (!paymentAccountId) {
      return res.status(400).json({
        success: false,
        message: "paymentAccountId is required",
      });
    }

    if (!paymentNumber) {
      return res.status(400).json({
        success: false,
        message: "paymentNumber is required",
      });
    }

    if (!paymentDate) {
      return res.status(400).json({
        success: false,
        message: "paymentDate is required",
      });
    }

    if (amount === undefined || amount === null) {
      return res.status(400).json({
        success: false,
        message: "amount is required",
      });
    }

    if (Number(amount) <= 0) {
      return res.status(400).json({
        success: false,
        message: "amount must be greater than 0",
      });
    }

    if (
      !mongoose.Types.ObjectId.isValid(accountId) ||
      !mongoose.Types.ObjectId.isValid(paymentAccountId)
    ) {
      return res.status(400).json({
        success: false,
        message: "Invalid accountId or paymentAccountId",
      });
    }

    const company = await checkCompanyAccess(
      companyId,
      req.user.userId
    );

    if (!company) {
      return res.status(403).json({
        success: false,
        message: "You do not have access to this company",
      });
    }

    const financialYear = await getFinancialYear(
      financialYearId,
      companyId
    );

    if (!financialYear) {
      return res.status(404).json({
        success: false,
        message: "Financial year not found",
      });
    }

    const account = await Account.findOne({
      _id: accountId,
      company: companyId,
    });

    if (!account) {
      return res.status(404).json({
        success: false,
        message: "Party account not found",
      });
    }

    const paymentAccount = await Account.findOne({
      _id: paymentAccountId,
      company: companyId,
    });

    if (!paymentAccount) {
      return res.status(404).json({
        success: false,
        message: "Payment account not found",
      });
    }

    if (account._id.equals(paymentAccount._id)) {
      return res.status(400).json({
        success: false,
        message:
          "Party account and payment account cannot be the same",
      });
    }

    const existingPayment = await Payment.findOne({
      company: companyId,
      financialYear: financialYearId,
      paymentNumber: paymentNumber.trim(),
    });

    if (existingPayment) {
      return res.status(409).json({
        success: false,
        message: "Payment number already exists",
      });
    }

    const payment = await Payment.create({
      company: companyId,
      branch: branchId || null,
      financialYear: financialYearId,

      account: accountId,
      paymentAccount: paymentAccountId,

      paymentNumber: paymentNumber.trim(),
      paymentDate: new Date(paymentDate),

      amount: round2(amount),

      paymentMode: paymentMode || "cash",

      chequeNumber: chequeNumber || "",
      chequeDate: chequeDate || null,
      bankName: bankName || "",
      referenceNumber: referenceNumber || "",

      narration: narration || "",
      notes: notes || "",

      createdBy: req.user.userId,
      updatedBy: req.user.userId,
    });

    const populatedPayment = await Payment.findById(
      payment._id
    )
      .populate("account", "name type")
      .populate("paymentAccount", "name type")
      .populate("company", "name")
      .populate("branch", "name")
      .populate("financialYear", "name");

    return res.status(201).json({
      success: true,
      message: "Payment created successfully",
      data: populatedPayment,
    });
  } catch (error) {
    console.error("Create Payment Error:", error);

    if (error.code === 11000) {
      return res.status(409).json({
        success: false,
        message: "Payment number already exists",
      });
    }

    return res.status(500).json({
      success: false,
      message: "Failed to create payment",
      error: error.message,
    });
  }
};

/*
|--------------------------------------------------------------------------
| GET ALL PAYMENTS
|--------------------------------------------------------------------------
*/
const getPayments = async (req, res) => {
  try {
    const {
      companyId,
      branchId,
      financialYearId,
      accountId,
      paymentAccountId,
      paymentMode,
      fromDate,
      toDate,
      search,
      page = 1,
      limit = 50,
    } = req.query;

    if (!companyId || !financialYearId) {
      return res.status(400).json({
        success: false,
        message:
          "companyId and financialYearId are required",
      });
    }

    const company = await checkCompanyAccess(
      companyId,
      req.user.userId
    );

    if (!company) {
      return res.status(403).json({
        success: false,
        message: "You do not have access to this company",
      });
    }

    const financialYear = await getFinancialYear(
      financialYearId,
      companyId
    );

    if (!financialYear) {
      return res.status(404).json({
        success: false,
        message: "Financial year not found",
      });
    }

    const filter = {
      company: companyId,
      financialYear: financialYearId,
      isActive: true,
    };

    if (branchId) {
      filter.branch = branchId;
    }

    if (accountId) {
      filter.account = accountId;
    }

    if (paymentAccountId) {
      filter.paymentAccount = paymentAccountId;
    }

    if (paymentMode) {
      filter.paymentMode = paymentMode;
    }

    if (fromDate || toDate) {
      filter.paymentDate = {};

      if (fromDate) {
        filter.paymentDate.$gte = new Date(fromDate);
      }

      if (toDate) {
        const endDate = new Date(toDate);

        endDate.setHours(
          23,
          59,
          59,
          999
        );

        filter.paymentDate.$lte = endDate;
      }
    }

    if (search) {
      filter.$or = [
        {
          paymentNumber: {
            $regex: search,
            $options: "i",
          },
        },
        {
          referenceNumber: {
            $regex: search,
            $options: "i",
          },
        },
        {
          narration: {
            $regex: search,
            $options: "i",
          },
        },
      ];
    }

    const currentPage = Math.max(
      Number(page),
      1
    );

    const perPage = Math.min(
      Math.max(Number(limit), 1),
      100
    );

    const skip =
      (currentPage - 1) * perPage;

    const [payments, total] =
      await Promise.all([
        Payment.find(filter)
          .populate(
            "account",
            "name type"
          )
          .populate(
            "paymentAccount",
            "name type"
          )
          .populate(
            "branch",
            "name"
          )
          .populate(
            "financialYear",
            "name"
          )
          .sort({
            paymentDate: -1,
            createdAt: -1,
          })
          .skip(skip)
          .limit(perPage),

        Payment.countDocuments(filter),
      ]);

    return res.status(200).json({
      success: true,
      data: payments,
      pagination: {
        page: currentPage,
        limit: perPage,
        total,
        totalPages:
          Math.ceil(
            total / perPage
          ),
      },
    });
  } catch (error) {
    console.error(
      "Get Payments Error:",
      error
    );

    return res.status(500).json({
      success: false,
      message:
        "Failed to fetch payments",
      error: error.message,
    });
  }
};

/*
|--------------------------------------------------------------------------
| GET SINGLE PAYMENT
|--------------------------------------------------------------------------
*/
const getPaymentById = async (
  req,
  res
) => {
  try {
    const { id } = req.params;

    /*
     * companyId can come from:
     * 1. Query parameter
     * 2. Request body
     */
    const companyId =
      req.query.companyId ||
      req.body?.companyId;

    if (
      !mongoose.Types.ObjectId.isValid(
        id
      )
    ) {
      return res.status(400).json({
        success: false,
        message: "Invalid payment ID",
      });
    }

    if (!companyId) {
      return res.status(400).json({
        success: false,
        message:
          "companyId is required",
      });
    }

    const company =
      await checkCompanyAccess(
        companyId,
        req.user.userId
      );

    if (!company) {
      return res.status(403).json({
        success: false,
        message:
          "You do not have access to this company",
      });
    }

    const payment =
      await Payment.findOne({
        _id: id,
        company: companyId,
        isActive: true,
      })
        .populate(
          "account",
          "name type"
        )
        .populate(
          "paymentAccount",
          "name type"
        )
        .populate(
          "company",
          "name"
        )
        .populate(
          "branch",
          "name"
        )
        .populate(
          "financialYear",
          "name"
        );

    if (!payment) {
      return res.status(404).json({
        success: false,
        message: "Payment not found",
      });
    }

    return res.status(200).json({
      success: true,
      data: payment,
    });
  } catch (error) {
    console.error(
      "Get Payment Error:",
      error
    );

    return res.status(500).json({
      success: false,
      message:
        "Failed to fetch payment",
      error: error.message,
    });
  }
};

/*
|--------------------------------------------------------------------------
| UPDATE PAYMENT
|--------------------------------------------------------------------------
*/
const updatePayment = async (
  req,
  res
) => {
  try {
    const { id } = req.params;

    /*
     * IMPORTANT:
     * companyId is accepted from BOTH:
     * req.body.companyId
     * req.query.companyId
     *
     * This avoids the previous
     * "companyId is required" problem.
     */
    const companyId =
      req.body?.companyId ||
      req.query.companyId;

    if (
      !mongoose.Types.ObjectId.isValid(
        id
      )
    ) {
      return res.status(400).json({
        success: false,
        message: "Invalid payment ID",
      });
    }

    if (!companyId) {
      return res.status(400).json({
        success: false,
        message:
          "companyId is required",
      });
    }

    const company =
      await checkCompanyAccess(
        companyId,
        req.user.userId
      );

    if (!company) {
      return res.status(403).json({
        success: false,
        message:
          "You do not have access to this company",
      });
    }

    const payment =
      await Payment.findOne({
        _id: id,
        company: companyId,
        isActive: true,
      });

    if (!payment) {
      return res.status(404).json({
        success: false,
        message: "Payment not found",
      });
    }

    const {
      branchId,
      financialYearId,
      accountId,
      paymentAccountId,
      paymentNumber,
      paymentDate,
      amount,
      paymentMode,
      chequeNumber,
      chequeDate,
      bankName,
      referenceNumber,
      narration,
      notes,
    } = req.body;

    /*
    |--------------------------------------------------------------------------
    | FINANCIAL YEAR
    |--------------------------------------------------------------------------
    */

    if (financialYearId) {
      if (
        !mongoose.Types.ObjectId.isValid(
          financialYearId
        )
      ) {
        return res.status(400).json({
          success: false,
          message:
            "Invalid financialYearId",
        });
      }

      const financialYear =
        await getFinancialYear(
          financialYearId,
          companyId
        );

      if (!financialYear) {
        return res.status(404).json({
          success: false,
          message:
            "Financial year not found",
        });
      }

      payment.financialYear =
        financialYearId;
    }

    /*
    |--------------------------------------------------------------------------
    | PARTY ACCOUNT
    |--------------------------------------------------------------------------
    */

    if (accountId) {
      if (
        !mongoose.Types.ObjectId.isValid(
          accountId
        )
      ) {
        return res.status(400).json({
          success: false,
          message:
            "Invalid accountId",
        });
      }

      const account =
        await Account.findOne({
          _id: accountId,
          company: companyId,
        });

      if (!account) {
        return res.status(404).json({
          success: false,
          message:
            "Party account not found",
        });
      }

      payment.account =
        accountId;
    }

    /*
    |--------------------------------------------------------------------------
    | PAYMENT ACCOUNT
    |--------------------------------------------------------------------------
    */

    if (paymentAccountId) {
      if (
        !mongoose.Types.ObjectId.isValid(
          paymentAccountId
        )
      ) {
        return res.status(400).json({
          success: false,
          message:
            "Invalid paymentAccountId",
        });
      }

      const paymentAccount =
        await Account.findOne({
          _id: paymentAccountId,
          company: companyId,
        });

      if (!paymentAccount) {
        return res.status(404).json({
          success: false,
          message:
            "Payment account not found",
        });
      }

      payment.paymentAccount =
        paymentAccountId;
    }

    /*
    |--------------------------------------------------------------------------
    | SAME ACCOUNT CHECK
    |--------------------------------------------------------------------------
    */

    if (
      payment.account.equals(
        payment.paymentAccount
      )
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Party account and payment account cannot be the same",
      });
    }

    /*
    |--------------------------------------------------------------------------
    | PAYMENT NUMBER
    |--------------------------------------------------------------------------
    */

    if (
      paymentNumber !==
      undefined
    ) {
      if (!paymentNumber.trim()) {
        return res.status(400).json({
          success: false,
          message:
            "paymentNumber cannot be empty",
        });
      }

      const existingPayment =
        await Payment.findOne({
          _id: {
            $ne: id,
          },
          company: companyId,
          financialYear:
            payment.financialYear,
          paymentNumber:
            paymentNumber.trim(),
        });

      if (existingPayment) {
        return res.status(409).json({
          success: false,
          message:
            "Payment number already exists",
        });
      }

      payment.paymentNumber =
        paymentNumber.trim();
    }

    /*
    |--------------------------------------------------------------------------
    | BRANCH
    |--------------------------------------------------------------------------
    */

    if (
      branchId !== undefined
    ) {
      if (
        branchId &&
        !mongoose.Types.ObjectId.isValid(
          branchId
        )
      ) {
        return res.status(400).json({
          success: false,
          message:
            "Invalid branchId",
        });
      }

      payment.branch =
        branchId || null;
    }

    /*
    |--------------------------------------------------------------------------
    | PAYMENT DATE
    |--------------------------------------------------------------------------
    */

    if (
      paymentDate !==
      undefined
    ) {
      const parsedDate =
        new Date(paymentDate);

      if (
        Number.isNaN(
          parsedDate.getTime()
        )
      ) {
        return res.status(400).json({
          success: false,
          message:
            "Invalid paymentDate",
        });
      }

      payment.paymentDate =
        parsedDate;
    }

    /*
    |--------------------------------------------------------------------------
    | AMOUNT
    |--------------------------------------------------------------------------
    */

    if (
      amount !== undefined
    ) {
      if (
        Number(amount) <= 0
      ) {
        return res.status(400).json({
          success: false,
          message:
            "amount must be greater than 0",
        });
      }

      if (
        Number.isNaN(
          Number(amount)
        )
      ) {
        return res.status(400).json({
          success: false,
          message:
            "Invalid amount",
        });
      }

      payment.amount =
        round2(amount);
    }

    /*
    |--------------------------------------------------------------------------
    | PAYMENT MODE
    |--------------------------------------------------------------------------
    */

    if (
      paymentMode !==
      undefined
    ) {
      const allowedModes = [
        "cash",
        "bank",
        "upi",
        "cheque",
        "card",
        "other",
      ];

      if (
        !allowedModes.includes(
          paymentMode
        )
      ) {
        return res.status(400).json({
          success: false,
          message:
            "Invalid paymentMode",
        });
      }

      payment.paymentMode =
        paymentMode;
    }

    /*
    |--------------------------------------------------------------------------
    | CHEQUE
    |--------------------------------------------------------------------------
    */

    if (
      chequeNumber !==
      undefined
    ) {
      payment.chequeNumber =
        chequeNumber;
    }

    if (
      chequeDate !==
      undefined
    ) {
      payment.chequeDate =
        chequeDate || null;
    }

    /*
    |--------------------------------------------------------------------------
    | BANK
    |--------------------------------------------------------------------------
    */

    if (
      bankName !== undefined
    ) {
      payment.bankName =
        bankName;
    }

    /*
    |--------------------------------------------------------------------------
    | REFERENCE
    |--------------------------------------------------------------------------
    */

    if (
      referenceNumber !==
      undefined
    ) {
      payment.referenceNumber =
        referenceNumber;
    }

    /*
    |--------------------------------------------------------------------------
    | NARRATION
    |--------------------------------------------------------------------------
    */

    if (
      narration !==
      undefined
    ) {
      payment.narration =
        narration;
    }

    /*
    |--------------------------------------------------------------------------
    | NOTES
    |--------------------------------------------------------------------------
    */

    if (notes !== undefined) {
      payment.notes = notes;
    }

    payment.updatedBy =
      req.user.userId;

    await payment.save();

    const updatedPayment =
      await Payment.findById(
        payment._id
      )
        .populate(
          "account",
          "name type"
        )
        .populate(
          "paymentAccount",
          "name type"
        )
        .populate(
          "company",
          "name"
        )
        .populate(
          "branch",
          "name"
        )
        .populate(
          "financialYear",
          "name"
        );

    return res.status(200).json({
      success: true,
      message:
        "Payment updated successfully",
      data: updatedPayment,
    });
  } catch (error) {
    console.error(
      "Update Payment Error:",
      error
    );

    if (
      error.code === 11000
    ) {
      return res.status(409).json({
        success: false,
        message:
          "Payment number already exists",
      });
    }

    return res.status(500).json({
      success: false,
      message:
        "Failed to update payment",
      error: error.message,
    });
  }
};

/*
|--------------------------------------------------------------------------
| DELETE PAYMENT
|--------------------------------------------------------------------------
*/
const deletePayment = async (
  req,
  res
) => {
  try {
    const { id } = req.params;

    /*
     * companyId can come from:
     * 1. Query parameter
     * 2. Request body
     */
    const companyId =
      req.body?.companyId ||
      req.query.companyId;

    if (
      !mongoose.Types.ObjectId.isValid(
        id
      )
    ) {
      return res.status(400).json({
        success: false,
        message: "Invalid payment ID",
      });
    }

    if (!companyId) {
      return res.status(400).json({
        success: false,
        message:
          "companyId is required",
      });
    }

    const company =
      await checkCompanyAccess(
        companyId,
        req.user.userId
      );

    if (!company) {
      return res.status(403).json({
        success: false,
        message:
          "You do not have access to this company",
      });
    }

    const payment =
      await Payment.findOne({
        _id: id,
        company: companyId,
        isActive: true,
      });

    if (!payment) {
      return res.status(404).json({
        success: false,
        message: "Payment not found",
      });
    }

    payment.isActive = false;

    payment.updatedBy =
      req.user.userId;

    await payment.save();

    return res.status(200).json({
      success: true,
      message:
        "Payment deleted successfully",
    });
  } catch (error) {
    console.error(
      "Delete Payment Error:",
      error
    );

    return res.status(500).json({
      success: false,
      message:
        "Failed to delete payment",
      error: error.message,
    });
  }
};

module.exports = {
  createPayment,
  getPayments,
  getPaymentById,
  updatePayment,
  deletePayment,
};