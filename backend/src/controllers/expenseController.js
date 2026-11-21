const mongoose = require("mongoose");

const Expense = require("../models/Expense");
const Company = require("../models/Company");
const Branch = require("../models/Branch");
const FinancialYear = require("../models/FinancialYear");
const Account = require("../models/Account");

const round2 = (value) =>
  Math.round(
    (Number(value || 0) + Number.EPSILON) * 100
  ) / 100;

const isValidObjectId = (value) =>
  mongoose.Types.ObjectId.isValid(value);

const parseDate = (value) => {
  if (!value) {
    return null;
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return null;
  }

  return date;
};

const getCompany = async (
  companyId,
  userId
) => {
  return Company.findOne({
    _id: companyId,
    owner: userId,
  }).lean();
};

const getFinancialYear = async (
  financialYearId,
  companyId
) => {
  return FinancialYear.findOne({
    _id: financialYearId,
    company: companyId,
    isActive: true,
  }).lean();
};

const validateContext = async (
  companyId,
  financialYearId,
  userId
) => {
  if (!companyId) {
    return {
      error: "companyId is required",
    };
  }

  if (!isValidObjectId(companyId)) {
    return {
      error: "Invalid company ID",
    };
  }

  if (!financialYearId) {
    return {
      error: "financialYearId is required",
    };
  }

  if (!isValidObjectId(financialYearId)) {
    return {
      error: "Invalid financial year ID",
    };
  }

  const company = await getCompany(
    companyId,
    userId
  );

  if (!company) {
    return {
      error:
        "Company not found or access denied",
    };
  }

  const financialYear =
    await getFinancialYear(
      financialYearId,
      companyId
    );

  if (!financialYear) {
    return {
      error:
        "Financial year not found for this company",
    };
  }

  return {
    company,
    financialYear,
  };
};

const validateBranch = async (
  branchId,
  companyId
) => {
  if (!branchId) {
    return null;
  }

  if (!isValidObjectId(branchId)) {
    return {
      error: "Invalid branch ID",
    };
  }

  const branch = await Branch.findOne({
    _id: branchId,
    company: companyId,
  }).lean();

  if (!branch) {
    return {
      error:
        "Branch not found for this company",
    };
  }

  return branch;
};

const validateAccount = async (
  accountId,
  companyId
) => {
  if (!accountId) {
    return {
      error: "Account is required",
    };
  }

  if (!isValidObjectId(accountId)) {
    return {
      error: "Invalid account ID",
    };
  }

  const account = await Account.findOne({
    _id: accountId,
    company: companyId,
    isActive: {
      $ne: false,
    },
  }).lean();

  if (!account) {
    return {
      error:
        "Account not found for this company",
    };
  }

  return account;
};

const validateExpenseAccount = async (
  expenseAccountId,
  companyId,
  category
) => {
  // If a valid ID is provided, use it directly
  if (expenseAccountId && isValidObjectId(expenseAccountId)) {
    const expenseAccount = await Account.findOne({
      _id: expenseAccountId,
      company: companyId,
      isActive: { $ne: false },
    }).lean();

    if (!expenseAccount) {
      return { error: "Expense account not found for this company" };
    }

    return expenseAccount;
  }

  // Auto-resolve: find or create an expense account by category name
  const categoryName = (category || "Office Expense").trim();

  let expenseAccount = await Account.findOne({
    company: companyId,
    accountType: "expense",
    isActive: { $ne: false },
    name: { $regex: new RegExp(`^${categoryName}$`, "i") },
  }).lean();

  if (!expenseAccount) {
    // Try any expense account for this company as fallback
    expenseAccount = await Account.findOne({
      company: companyId,
      accountType: "expense",
      isActive: { $ne: false },
    }).lean();
  }

  if (!expenseAccount) {
    // Auto-create a generic expense account for this company
    const newAccount = await Account.create({
      company: companyId,
      name: categoryName,
      accountType: "expense",
      accountCode: `EXP-${Date.now().toString().slice(-5)}`,
      isActive: true,
    });
    return newAccount.toObject();
  }

  return expenseAccount;
};

const validatePaymentAccount = async (
  accountId,
  companyId,
  paymentMode
) => {
  const account =
    await validateAccount(
      accountId,
      companyId
    );

  if (account.error) {
    return account;
  }

  const accountType = String(
    account.accountType || ""
  ).toLowerCase();

  if (
    paymentMode === "cash" &&
    accountType !== "cash"
  ) {
    return {
      error:
        "Cash payment mode requires a cash account",
    };
  }

  if (
    [
      "bank",
      "upi",
      "cheque",
      "card",
    ].includes(paymentMode) &&
    !["bank", "cash"].includes(
      accountType
    )
  ) {
    return {
      error:
        "Selected account must be a bank or cash account",
    };
  }

  return account;
};

const generateExpenseNumber = async (
  companyId,
  financialYearId
) => {
  const lastExpense =
    await Expense.findOne({
      company: companyId,
      financialYear: financialYearId,
    })
      .sort({
        createdAt: -1,
      })
      .select("expenseNumber")
      .lean();

  if (
    !lastExpense ||
    !lastExpense.expenseNumber
  ) {
    return "EXP-00001";
  }

  const match = String(
    lastExpense.expenseNumber
  ).match(/(\d+)$/);

  if (!match) {
    return "EXP-00001";
  }

  const nextNumber =
    Number(match[1]) + 1;

  return `EXP-${String(
    nextNumber
  ).padStart(5, "0")}`;
};

const validateExpenseFields = ({
  amount,
  paymentMode,
  chequeNumber,
  chequeDate,
  bankName,
}) => {
  const numericAmount =
    Number(amount);

  if (
    Number.isNaN(numericAmount) ||
    numericAmount <= 0
  ) {
    return {
      error:
        "Amount must be greater than 0",
    };
  }

  const allowedModes = [
    "cash",
    "bank",
    "upi",
    "cheque",
    "card",
    "other",
  ];

  if (
    !allowedModes.includes(paymentMode)
  ) {
    return {
      error: "Invalid payment mode",
    };
  }

  if (
    paymentMode === "cheque" &&
    !chequeNumber
  ) {
    return {
      error:
        "Cheque number is required for cheque payment",
    };
  }

  if (
    paymentMode === "cheque" &&
    chequeDate &&
    !parseDate(chequeDate)
  ) {
    return {
      error: "Invalid cheque date",
    };
  }

  if (
    paymentMode === "bank" &&
    !bankName
  ) {
    return {
      error:
        "Bank name is required for bank payment",
    };
  }

  return null;
};

/*
|--------------------------------------------------------------------------
| CREATE EXPENSE
|--------------------------------------------------------------------------
*/

const createExpense = async (
  req,
  res,
  next
) => {
  try {
    const {
      companyId,
      branchId,
      financialYearId,
      accountId,
      expenseAccountId,
      category,
      expenseNumber,
      expenseDate,
      amount,
      paymentMode: rawPaymentMode = "cash",
      chequeNumber = "",
      chequeDate = null,
      bankName: rawBankName = "",
      referenceNumber = "",
      narration = "",
      notes = "",
    } = req.body;

    const context =
      await validateContext(
        companyId,
        financialYearId,
        req.user.userId
      );

    if (context.error) {
      return res.status(400).json({
        success: false,
        message: context.error,
      });
    }

    const branch =
      await validateBranch(
        branchId,
        companyId
      );

    if (
      branch &&
      branch.error
    ) {
      return res.status(400).json({
        success: false,
        message: branch.error,
      });
    }

    const expenseAccount =
      await validateExpenseAccount(
        expenseAccountId,
        companyId,
        category
      );

    if (expenseAccount.error) {
      return res.status(400).json({
        success: false,
        message:
          expenseAccount.error,
      });
    }

    // Validate payment account first so we can auto-derive paymentMode & bankName
    let account =
      await validatePaymentAccount(
        accountId,
        companyId,
        rawPaymentMode
      );

    // If paymentMode mismatch, auto-correct it based on the account type
    let paymentMode = rawPaymentMode;
    let bankName = rawBankName;

    if (account.error) {
      // Try auto-aligning paymentMode with the actual account type
      const rawAccount = await Account.findOne({
        _id: accountId,
        company: companyId,
        isActive: { $ne: false },
      }).lean();

      if (!rawAccount) {
        return res.status(400).json({
          success: false,
          message: account.error,
        });
      }

      const accType = String(rawAccount.accountType || "").toLowerCase();
      paymentMode = accType === "bank" ? "bank" : "cash";
      bankName = accType === "bank" ? (rawBankName || rawAccount.name || "") : "";

      // Re-validate with corrected paymentMode
      const recheck = await validatePaymentAccount(accountId, companyId, paymentMode);
      if (recheck.error) {
        return res.status(400).json({ success: false, message: recheck.error });
      }
      account = recheck; // use the validated account object
    } else {
      // Auto-populate bankName for bank accounts if not provided
      const accType = String(account.accountType || "").toLowerCase();
      if (accType === "bank" && !bankName) {
        bankName = account.name || "";
      }
      if (accType === "bank") {
        paymentMode = "bank";
      } else if (accType === "cash") {
        paymentMode = "cash";
      }
    }

    const fieldValidation =
      validateExpenseFields({
        amount,
        paymentMode,
        chequeNumber,
        chequeDate,
        bankName,
      });

    if (fieldValidation) {
      return res.status(400).json({
        success: false,
        message:
          fieldValidation.error,
      });
    }

    const parsedExpenseDate =
      parseDate(expenseDate);

    if (!parsedExpenseDate) {
      return res.status(400).json({
        success: false,
        message:
          "Valid expenseDate is required",
      });
    }

    if (
      parsedExpenseDate <
        new Date(
          context.financialYear.startDate
        ) ||
      parsedExpenseDate >
        new Date(
          context.financialYear.endDate
        )
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Expense date must be within the selected financial year",
      });
    }

    let finalExpenseNumber =
      expenseNumber;

    if (
      !finalExpenseNumber ||
      !String(
        finalExpenseNumber
      ).trim()
    ) {
      finalExpenseNumber =
        await generateExpenseNumber(
          companyId,
          financialYearId
        );
    }

    finalExpenseNumber = String(
      finalExpenseNumber
    )
      .trim()
      .toUpperCase();

    const existingExpense =
      await Expense.findOne({
        company: companyId,
        financialYear:
          financialYearId,
        expenseNumber:
          finalExpenseNumber,
      }).lean();

    if (existingExpense) {
      return res.status(409).json({
        success: false,
        message:
          "Expense number already exists",
      });
    }

    const expense =
      await Expense.create({
        company: companyId,
        branch: branchId || null,
        financialYear:
          financialYearId,
        account: account._id,
        expenseAccount:
          expenseAccount._id,
        expenseNumber:
          finalExpenseNumber,
        expenseDate:
          parsedExpenseDate,
        amount: round2(amount),
        paymentMode,
        chequeNumber:
          chequeNumber || "",
        chequeDate:
          chequeDate
            ? parseDate(chequeDate)
            : null,
        bankName:
          bankName || "",
        referenceNumber:
          referenceNumber || "",
        narration:
          narration || "",
        notes: notes || "",
        isActive: true,
        createdBy:
          req.user.userId,
        updatedBy:
          req.user.userId,
      });

    const populatedExpense =
      await Expense.findById(
        expense._id
      )
        .populate(
          "company",
          "name email phone"
        )
        .populate(
          "branch",
          "name code"
        )
        .populate(
          "financialYear",
          "name startDate endDate"
        )
        .populate(
          "account",
          "name accountCode accountType"
        )
        .populate(
          "expenseAccount",
          "name accountCode accountType"
        );

    return res.status(201).json({
      success: true,
      message:
        "Expense created successfully",
      expense:
        populatedExpense,
    });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(409).json({
        success: false,
        message:
          "Expense number already exists",
      });
    }

    next(error);
  }
};

/*
|--------------------------------------------------------------------------
| GET EXPENSE LIST
|--------------------------------------------------------------------------
*/

const getExpenses = async (
  req,
  res,
  next
) => {
  try {
    const {
      companyId,
      branchId,
      financialYearId,
      accountId,
      expenseAccountId,
      paymentMode,
      fromDate,
      toDate,
      search,
      page = 1,
      limit = 50,
    } = req.query;

    const context =
      await validateContext(
        companyId,
        financialYearId,
        req.user.userId
      );

    if (context.error) {
      return res.status(400).json({
        success: false,
        message: context.error,
      });
    }

    const filter = {
      company: companyId,
      financialYear:
        financialYearId,
      isActive: true,
    };

    if (branchId) {
      if (
        !isValidObjectId(branchId)
      ) {
        return res.status(400).json({
          success: false,
          message:
            "Invalid branch ID",
        });
      }

      filter.branch = branchId;
    }

    if (accountId) {
      if (
        !isValidObjectId(accountId)
      ) {
        return res.status(400).json({
          success: false,
          message:
            "Invalid account ID",
        });
      }

      filter.account = accountId;
    }

    if (expenseAccountId) {
      if (
        !isValidObjectId(
          expenseAccountId
        )
      ) {
        return res.status(400).json({
          success: false,
          message:
            "Invalid expense account ID",
        });
      }

      filter.expenseAccount =
        expenseAccountId;
    }

    if (paymentMode) {
      filter.paymentMode =
        paymentMode;
    }

    const parsedFromDate =
      fromDate
        ? parseDate(fromDate)
        : null;

    const parsedToDate =
      toDate
        ? parseDate(toDate)
        : null;

    if (
      fromDate &&
      !parsedFromDate
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Invalid fromDate",
      });
    }

    if (
      toDate &&
      !parsedToDate
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Invalid toDate",
      });
    }

    if (
      parsedFromDate &&
      parsedToDate &&
      parsedFromDate >
        parsedToDate
    ) {
      return res.status(400).json({
        success: false,
        message:
          "fromDate must be earlier than or equal to toDate",
      });
    }

    if (
      parsedFromDate ||
      parsedToDate
    ) {
      filter.expenseDate = {};

      if (parsedFromDate) {
        const from =
          new Date(
            parsedFromDate
          );

        from.setHours(
          0,
          0,
          0,
          0
        );

        filter.expenseDate.$gte =
          from;
      }

      if (parsedToDate) {
        const to =
          new Date(
            parsedToDate
          );

        to.setHours(
          23,
          59,
          59,
          999
        );

        filter.expenseDate.$lte =
          to;
      }
    }

    if (search) {
      const value =
        String(search).trim();

      filter.$or = [
        {
          expenseNumber: {
            $regex: value,
            $options: "i",
          },
        },
        {
          referenceNumber: {
            $regex: value,
            $options: "i",
          },
        },
        {
          narration: {
            $regex: value,
            $options: "i",
          },
        },
        {
          notes: {
            $regex: value,
            $options: "i",
          },
        },
      ];
    }

    const pageNumber =
      Math.max(
        Number(page) || 1,
        1
      );

    const limitNumber =
      Math.min(
        Math.max(
          Number(limit) || 50,
          1
        ),
        100
      );

    const skip =
      (pageNumber - 1) *
      limitNumber;

    const [
      expenses,
      totalRecords,
    ] = await Promise.all([
      Expense.find(filter)
        .populate(
          "account",
          "name accountCode accountType"
        )
        .populate(
          "expenseAccount",
          "name accountCode accountType"
        )
        .populate(
          "branch",
          "name code"
        )
        .sort({
          expenseDate: -1,
          createdAt: -1,
        })
        .skip(skip)
        .limit(limitNumber)
        .lean(),

      Expense.countDocuments(
        filter
      ),
    ]);

    const totalAmount =
      expenses.reduce(
        (sum, expense) =>
          sum +
          Number(
            expense.amount || 0
          ),
        0
      );

    return res.status(200).json({
      success: true,
      message:
        "Expense records fetched successfully",
      data: {
        expenses,
        summary: {
          currentPageAmount:
            round2(totalAmount),
        },
        pagination: {
          page: pageNumber,
          limit: limitNumber,
          totalRecords,
          totalPages:
            totalRecords === 0
              ? 0
              : Math.ceil(
                  totalRecords /
                    limitNumber
                ),
        },
        filters: {
          companyId,
          branchId:
            branchId || null,
          financialYearId,
          accountId:
            accountId || null,
          expenseAccountId:
            expenseAccountId ||
            null,
          paymentMode:
            paymentMode || null,
          fromDate:
            fromDate || null,
          toDate:
            toDate || null,
          search:
            search || "",
        },
      },
    });
  } catch (error) {
    next(error);
  }
};

/*
|--------------------------------------------------------------------------
| GET EXPENSE BY ID
|--------------------------------------------------------------------------
*/

const getExpenseById = async (
  req,
  res,
  next
) => {
  try {
    const { id } = req.params;

    const companyId =
      req.query.companyId ||
      req.body.companyId;

    const financialYearId =
      req.query.financialYearId ||
      req.body.financialYearId;

    if (!isValidObjectId(id)) {
      return res.status(400).json({
        success: false,
        message:
          "Invalid expense ID",
      });
    }

    if (!companyId) {
      return res.status(400).json({
        success: false,
        message:
          "companyId is required",
      });
    }

    if (!isValidObjectId(companyId)) {
      return res.status(400).json({
        success: false,
        message:
          "Invalid company ID",
      });
    }

    const company =
      await getCompany(
        companyId,
        req.user.userId
      );

    if (!company) {
      return res.status(404).json({
        success: false,
        message:
          "Company not found or access denied",
      });
    }

    const filter = {
      _id: id,
      company: companyId,
      isActive: true,
    };

    if (financialYearId) {
      if (
        !isValidObjectId(
          financialYearId
        )
      ) {
        return res.status(400).json({
          success: false,
          message:
            "Invalid financial year ID",
        });
      }

      filter.financialYear =
        financialYearId;
    }

    const expense =
      await Expense.findOne(filter)
        .populate(
          "company",
          "name email phone"
        )
        .populate(
          "branch",
          "name code"
        )
        .populate(
          "financialYear",
          "name startDate endDate"
        )
        .populate(
          "account",
          "name accountCode accountType openingBalance openingBalanceType"
        )
        .populate(
          "expenseAccount",
          "name accountCode accountType"
        )
        .lean();

    if (!expense) {
      return res.status(404).json({
        success: false,
        message:
          "Expense record not found",
      });
    }

    return res.status(200).json({
      success: true,
      message:
        "Expense record fetched successfully",
      expense,
    });
  } catch (error) {
    next(error);
  }
};

/*
|--------------------------------------------------------------------------
| UPDATE EXPENSE
|--------------------------------------------------------------------------
*/

const updateExpense = async (
  req,
  res,
  next
) => {
  try {
    const { id } = req.params;

    const {
      companyId,
      branchId,
      accountId,
      expenseAccountId,
      expenseNumber,
      expenseDate,
      amount,
      paymentMode,
      chequeNumber,
      chequeDate,
      bankName,
      referenceNumber,
      narration,
      notes,
    } = req.body;

    if (!isValidObjectId(id)) {
      return res.status(400).json({
        success: false,
        message:
          "Invalid expense ID",
      });
    }

    if (!companyId) {
      return res.status(400).json({
        success: false,
        message:
          "companyId is required",
      });
    }

    if (!isValidObjectId(companyId)) {
      return res.status(400).json({
        success: false,
        message:
          "Invalid company ID",
      });
    }

    const company =
      await getCompany(
        companyId,
        req.user.userId
      );

    if (!company) {
      return res.status(404).json({
        success: false,
        message:
          "Company not found or access denied",
      });
    }

    const expense =
      await Expense.findOne({
        _id: id,
        company: companyId,
        isActive: true,
      });

    if (!expense) {
      return res.status(404).json({
        success: false,
        message:
          "Expense record not found",
      });
    }

    const finalPaymentMode =
      paymentMode ||
      expense.paymentMode;

    const finalAccountId =
      accountId ||
      expense.account.toString();

    const finalExpenseAccountId =
      expenseAccountId ||
      expense.expenseAccount.toString();

    const account =
      await validatePaymentAccount(
        finalAccountId,
        companyId,
        finalPaymentMode
      );

    if (account.error) {
      return res.status(400).json({
        success: false,
        message: account.error,
      });
    }

    const expenseAccount =
      await validateExpenseAccount(
        finalExpenseAccountId,
        companyId
      );

    if (expenseAccount.error) {
      return res.status(400).json({
        success: false,
        message:
          expenseAccount.error,
      });
    }

    if (
      branchId !== undefined
    ) {
      const branch =
        await validateBranch(
          branchId,
          companyId
        );

      if (
        branch &&
        branch.error
      ) {
        return res.status(400).json({
          success: false,
          message:
            branch.error,
        });
      }

      expense.branch =
        branchId || null;
    }

    if (amount !== undefined) {
      const numericAmount =
        Number(amount);

      if (
        Number.isNaN(
          numericAmount
        ) ||
        numericAmount <= 0
      ) {
        return res.status(400).json({
          success: false,
          message:
            "Amount must be greater than 0",
        });
      }

      expense.amount =
        round2(amount);
    }

    if (
      paymentMode !== undefined
    ) {
      expense.paymentMode =
        paymentMode;
    }

    const fieldValidation =
      validateExpenseFields({
        amount: expense.amount,
        paymentMode:
          finalPaymentMode,
        chequeNumber:
          chequeNumber !==
          undefined
            ? chequeNumber
            : expense.chequeNumber,
        chequeDate:
          chequeDate !==
          undefined
            ? chequeDate
            : expense.chequeDate,
        bankName:
          bankName !== undefined
            ? bankName
            : expense.bankName,
      });

    if (fieldValidation) {
      return res.status(400).json({
        success: false,
        message:
          fieldValidation.error,
      });
    }

    if (
      expenseDate !== undefined
    ) {
      const parsedDate =
        parseDate(expenseDate);

      if (!parsedDate) {
        return res.status(400).json({
          success: false,
          message:
            "Invalid expenseDate",
        });
      }

      expense.expenseDate =
        parsedDate;
    }

    if (
      expenseNumber !==
      undefined
    ) {
      const finalNumber =
        String(
          expenseNumber
        )
          .trim()
          .toUpperCase();

      if (!finalNumber) {
        return res.status(400).json({
          success: false,
          message:
            "Expense number cannot be empty",
        });
      }

      const duplicate =
        await Expense.findOne({
          _id: {
            $ne: id,
          },
          company: companyId,
          financialYear:
            expense.financialYear,
          expenseNumber:
            finalNumber,
        }).lean();

      if (duplicate) {
        return res.status(409).json({
          success: false,
          message:
            "Expense number already exists",
        });
      }

      expense.expenseNumber =
        finalNumber;
    }

    expense.account =
      account._id;

    expense.expenseAccount =
      expenseAccount._id;

    if (
      chequeNumber !==
      undefined
    ) {
      expense.chequeNumber =
        chequeNumber || "";
    }

    if (
      chequeDate !==
      undefined
    ) {
      expense.chequeDate =
        chequeDate
          ? parseDate(chequeDate)
          : null;
    }

    if (
      bankName !== undefined
    ) {
      expense.bankName =
        bankName || "";
    }

    if (
      referenceNumber !==
      undefined
    ) {
      expense.referenceNumber =
        referenceNumber || "";
    }

    if (
      narration !== undefined
    ) {
      expense.narration =
        narration || "";
    }

    if (notes !== undefined) {
      expense.notes =
        notes || "";
    }

    expense.updatedBy =
      req.user.userId;

    await expense.save();

    const populatedExpense =
      await Expense.findById(
        expense._id
      )
        .populate(
          "company",
          "name email phone"
        )
        .populate(
          "branch",
          "name code"
        )
        .populate(
          "financialYear",
          "name startDate endDate"
        )
        .populate(
          "account",
          "name accountCode accountType"
        )
        .populate(
          "expenseAccount",
          "name accountCode accountType"
        );

    return res.status(200).json({
      success: true,
      message:
        "Expense updated successfully",
      expense:
        populatedExpense,
    });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(409).json({
        success: false,
        message:
          "Expense number already exists",
      });
    }

    next(error);
  }
};

/*
|--------------------------------------------------------------------------
| DELETE EXPENSE
|--------------------------------------------------------------------------
*/

const deleteExpense = async (
  req,
  res,
  next
) => {
  try {
    const { id } = req.params;

    const companyId =
      req.query.companyId ||
      req.body.companyId;

    if (!isValidObjectId(id)) {
      return res.status(400).json({
        success: false,
        message:
          "Invalid expense ID",
      });
    }

    if (!companyId) {
      return res.status(400).json({
        success: false,
        message:
          "companyId is required",
      });
    }

    if (!isValidObjectId(companyId)) {
      return res.status(400).json({
        success: false,
        message:
          "Invalid company ID",
      });
    }

    const company =
      await getCompany(
        companyId,
        req.user.userId
      );

    if (!company) {
      return res.status(404).json({
        success: false,
        message:
          "Company not found or access denied",
      });
    }

    const expense =
      await Expense.findOne({
        _id: id,
        company: companyId,
        isActive: true,
      });

    if (!expense) {
      return res.status(404).json({
        success: false,
        message:
          "Expense record not found",
      });
    }

    expense.isActive = false;

    expense.updatedBy =
      req.user.userId;

    await expense.save();

    return res.status(200).json({
      success: true,
      message:
        "Expense deleted successfully",
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  createExpense,
  getExpenses,
  getExpenseById,
  updateExpense,
  deleteExpense,
};