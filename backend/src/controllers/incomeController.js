const mongoose = require("mongoose");

const Income = require("../models/Income");
const Company = require("../models/Company");
const Branch = require("../models/Branch");
const FinancialYear = require("../models/FinancialYear");
const Account = require("../models/Account");

const round2 = (value) =>
  Math.round(
    (Number(value || 0) + Number.EPSILON) * 100
  ) / 100;

const isValidObjectId = (value) => {
  return mongoose.Types.ObjectId.isValid(value);
};

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
      error:
        "financialYearId is required",
    };
  }

  if (
    !isValidObjectId(
      financialYearId
    )
  ) {
    return {
      error:
        "Invalid financial year ID",
    };
  }

  const company =
    await getCompany(
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

  const branch =
    await Branch.findOne({
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

  const account =
    await Account.findOne({
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

const validateIncomeAccount = async (
  incomeAccountId,
  companyId,
  category
) => {
  // If a valid ID is provided, use it directly
  if (incomeAccountId && isValidObjectId(incomeAccountId)) {
    const incomeAccount = await Account.findOne({
      _id: incomeAccountId,
      company: companyId,
      isActive: { $ne: false },
    }).lean();

    if (!incomeAccount) {
      return { error: "Income account not found for this company" };
    }

    return incomeAccount;
  }

  // Auto-resolve: find or create an income account by category name
  const categoryName = (category || "Other Income").trim();

  let incomeAccount = await Account.findOne({
    company: companyId,
    accountType: "income",
    isActive: { $ne: false },
    name: { $regex: new RegExp(`^${categoryName}$`, "i") },
  }).lean();

  if (!incomeAccount) {
    // Try any income account for this company as fallback
    incomeAccount = await Account.findOne({
      company: companyId,
      accountType: "income",
      isActive: { $ne: false },
    }).lean();
  }

  if (!incomeAccount) {
    // Auto-create a generic income account for this company
    const newAccount = await Account.create({
      company: companyId,
      name: categoryName,
      accountType: "income",
      accountCode: `INC-${Date.now().toString().slice(-5)}`,
      isActive: true,
    });
    return newAccount.toObject();
  }

  return incomeAccount;
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

  const accountType =
    String(
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

const generateIncomeNumber =
  async (
    companyId,
    financialYearId
  ) => {
    const lastIncome =
      await Income.findOne({
        company: companyId,
        financialYear:
          financialYearId,
      })
        .sort({
          createdAt: -1,
        })
        .select("incomeNumber")
        .lean();

    if (
      !lastIncome ||
      !lastIncome.incomeNumber
    ) {
      return "INC-00001";
    }

    const match =
      String(
        lastIncome.incomeNumber
      ).match(/(\d+)$/);

    if (!match) {
      return "INC-00001";
    }

    const nextNumber =
      Number(match[1]) + 1;

    return `INC-${String(
      nextNumber
    ).padStart(5, "0")}`;
  };

const validateIncomeFields = ({
  amount,
  paymentMode,
  chequeNumber,
  chequeDate,
  bankName,
}) => {
  const numericAmount =
    Number(amount);

  if (
    Number.isNaN(
      numericAmount
    ) ||
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
    !allowedModes.includes(
      paymentMode
    )
  ) {
    return {
      error:
        "Invalid payment mode",
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
      error:
        "Invalid cheque date",
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
| CREATE INCOME
|--------------------------------------------------------------------------
*/

const createIncome = async (
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
      incomeAccountId,
      category,
      incomeNumber,
      incomeDate,
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

    const incomeAccount =
      await validateIncomeAccount(
        incomeAccountId,
        companyId,
        category
      );

    if (incomeAccount.error) {
      return res.status(400).json({
        success: false,
        message:
          incomeAccount.error,
      });
    }

    // Validate payment account; auto-correct paymentMode/bankName on mismatch
    let account =
      await validatePaymentAccount(
        accountId,
        companyId,
        rawPaymentMode
      );

    let paymentMode = rawPaymentMode;
    let bankName = rawBankName;

    if (account.error) {
      // Auto-align paymentMode with actual account type
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
      // Auto-populate bankName for bank accounts
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
      validateIncomeFields({
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

    const parsedIncomeDate =
      parseDate(incomeDate);

    if (!parsedIncomeDate) {
      return res.status(400).json({
        success: false,
        message:
          "Valid incomeDate is required",
      });
    }

    if (
      parsedIncomeDate <
        new Date(
          context.financialYear.startDate
        ) ||
      parsedIncomeDate >
        new Date(
          context.financialYear.endDate
        )
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Income date must be within the selected financial year",
      });
    }

    let finalIncomeNumber =
      incomeNumber;

    if (
      !finalIncomeNumber ||
      !String(
        finalIncomeNumber
      ).trim()
    ) {
      finalIncomeNumber =
        await generateIncomeNumber(
          companyId,
          financialYearId
        );
    }

    finalIncomeNumber =
      String(
        finalIncomeNumber
      )
        .trim()
        .toUpperCase();

    const existingIncome =
      await Income.findOne({
        company: companyId,
        financialYear:
          financialYearId,
        incomeNumber:
          finalIncomeNumber,
      }).lean();

    if (existingIncome) {
      return res.status(409).json({
        success: false,
        message:
          "Income number already exists",
      });
    }

    const income =
      await Income.create({
        company: companyId,
        branch:
          branchId || null,
        financialYear:
          financialYearId,
        account:
          account._id,
        incomeAccount:
          incomeAccount._id,
        incomeNumber:
          finalIncomeNumber,
        incomeDate:
          parsedIncomeDate,
        amount: round2(amount),
        paymentMode,
        chequeNumber:
          chequeNumber || "",
        chequeDate:
          chequeDate
            ? parseDate(
                chequeDate
              )
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

    const populatedIncome =
      await Income.findById(
        income._id
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
          "incomeAccount",
          "name accountCode accountType"
        );

    return res.status(201).json({
      success: true,
      message:
        "Income created successfully",
      income:
        populatedIncome,
    });
  } catch (error) {
    if (
      error.code === 11000
    ) {
      return res.status(409).json({
        success: false,
        message:
          "Income number already exists",
      });
    }

    next(error);
  }
};

/*
|--------------------------------------------------------------------------
| GET ALL INCOME
|--------------------------------------------------------------------------
*/

const getIncomes = async (
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
      incomeAccountId,
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
        !isValidObjectId(
          branchId
        )
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
        !isValidObjectId(
          accountId
        )
      ) {
        return res.status(400).json({
          success: false,
          message:
            "Invalid account ID",
        });
      }

      filter.account = accountId;
    }

    if (incomeAccountId) {
      if (
        !isValidObjectId(
          incomeAccountId
        )
      ) {
        return res.status(400).json({
          success: false,
          message:
            "Invalid income account ID",
        });
      }

      filter.incomeAccount =
        incomeAccountId;
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
      filter.incomeDate = {};

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

        filter.incomeDate.$gte =
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

        filter.incomeDate.$lte =
          to;
      }
    }

    if (search) {
      const value =
        String(search)
          .trim();

      filter.$or = [
        {
          incomeNumber: {
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
      incomes,
      totalRecords,
    ] = await Promise.all([
      Income.find(filter)
        .populate(
          "account",
          "name accountCode accountType"
        )
        .populate(
          "incomeAccount",
          "name accountCode accountType"
        )
        .populate(
          "branch",
          "name code"
        )
        .sort({
          incomeDate: -1,
          createdAt: -1,
        })
        .skip(skip)
        .limit(limitNumber)
        .lean(),

      Income.countDocuments(
        filter
      ),
    ]);

    const totalAmount =
      incomes.reduce(
        (sum, income) =>
          sum +
          Number(
            income.amount || 0
          ),
        0
      );

    return res.status(200).json({
      success: true,
      message:
        "Income records fetched successfully",
      data: {
        incomes,
        summary: {
          currentPageAmount:
            round2(
              totalAmount
            ),
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
          incomeAccountId:
            incomeAccountId ||
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
| GET INCOME BY ID
|--------------------------------------------------------------------------
*/

const getIncomeById = async (
  req,
  res,
  next
) => {
  try {
    const {
      id,
    } = req.params;

    const companyId =
      req.query.companyId ||
      req.body.companyId;

    const financialYearId =
      req.query.financialYearId ||
      req.body.financialYearId;

    if (
      !isValidObjectId(id)
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Invalid income ID",
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

    const income =
      await Income.findOne(
        filter
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
          "name accountCode accountType openingBalance openingBalanceType"
        )
        .populate(
          "incomeAccount",
          "name accountCode accountType"
        )
        .lean();

    if (!income) {
      return res.status(404).json({
        success: false,
        message:
          "Income record not found",
      });
    }

    return res.status(200).json({
      success: true,
      message:
        "Income record fetched successfully",
      income,
    });
  } catch (error) {
    next(error);
  }
};

/*
|--------------------------------------------------------------------------
| UPDATE INCOME
|--------------------------------------------------------------------------
*/

const updateIncome = async (
  req,
  res,
  next
) => {
  try {
    const {
      id,
    } = req.params;

    const {
      companyId,
      branchId,
      accountId,
      incomeAccountId,
      incomeNumber,
      incomeDate,
      amount,
      paymentMode,
      chequeNumber,
      chequeDate,
      bankName,
      referenceNumber,
      narration,
      notes,
    } = req.body;

    if (
      !isValidObjectId(id)
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Invalid income ID",
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

    const income =
      await Income.findOne({
        _id: id,
        company: companyId,
        isActive: true,
      });

    if (!income) {
      return res.status(404).json({
        success: false,
        message:
          "Income record not found",
      });
    }

    const finalPaymentMode =
      paymentMode ||
      income.paymentMode;

    const finalAccountId =
      accountId ||
      income.account.toString();

    const finalIncomeAccountId =
      incomeAccountId ||
      income.incomeAccount.toString();

    const account =
      await validatePaymentAccount(
        finalAccountId,
        companyId,
        finalPaymentMode
      );

    if (account.error) {
      return res.status(400).json({
        success: false,
        message:
          account.error,
      });
    }

    const incomeAccount =
      await validateIncomeAccount(
        finalIncomeAccountId,
        companyId
      );

    if (incomeAccount.error) {
      return res.status(400).json({
        success: false,
        message:
          incomeAccount.error,
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

      income.branch =
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

      income.amount =
        round2(amount);
    }

    if (paymentMode !== undefined) {
      income.paymentMode =
        paymentMode;
    }

    const fieldValidation =
      validateIncomeFields({
        amount:
          income.amount,
        paymentMode:
          finalPaymentMode,
        chequeNumber:
          chequeNumber !==
          undefined
            ? chequeNumber
            : income.chequeNumber,
        chequeDate:
          chequeDate !==
          undefined
            ? chequeDate
            : income.chequeDate,
        bankName:
          bankName !==
          undefined
            ? bankName
            : income.bankName,
      });

    if (fieldValidation) {
      return res.status(400).json({
        success: false,
        message:
          fieldValidation.error,
      });
    }

    if (
      incomeDate !== undefined
    ) {
      const parsedDate =
        parseDate(incomeDate);

      if (!parsedDate) {
        return res.status(400).json({
          success: false,
          message:
            "Invalid incomeDate",
        });
      }

      income.incomeDate =
        parsedDate;
    }

    if (
      incomeNumber !==
      undefined
    ) {
      const finalNumber =
        String(
          incomeNumber
        )
          .trim()
          .toUpperCase();

      if (!finalNumber) {
        return res.status(400).json({
          success: false,
          message:
            "Income number cannot be empty",
        });
      }

      const duplicate =
        await Income.findOne({
          _id: {
            $ne: id,
          },
          company: companyId,
          financialYear:
            income.financialYear,
          incomeNumber:
            finalNumber,
        }).lean();

      if (duplicate) {
        return res.status(409).json({
          success: false,
          message:
            "Income number already exists",
        });
      }

      income.incomeNumber =
        finalNumber;
    }

    income.account =
      account._id;

    income.incomeAccount =
      incomeAccount._id;

    if (
      chequeNumber !==
      undefined
    ) {
      income.chequeNumber =
        chequeNumber || "";
    }

    if (
      chequeDate !==
      undefined
    ) {
      income.chequeDate =
        chequeDate
          ? parseDate(
              chequeDate
            )
          : null;
    }

    if (
      bankName !== undefined
    ) {
      income.bankName =
        bankName || "";
    }

    if (
      referenceNumber !==
      undefined
    ) {
      income.referenceNumber =
        referenceNumber || "";
    }

    if (
      narration !== undefined
    ) {
      income.narration =
        narration || "";
    }

    if (notes !== undefined) {
      income.notes =
        notes || "";
    }

    income.updatedBy =
      req.user.userId;

    await income.save();

    const populatedIncome =
      await Income.findById(
        income._id
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
          "incomeAccount",
          "name accountCode accountType"
        );

    return res.status(200).json({
      success: true,
      message:
        "Income updated successfully",
      income:
        populatedIncome,
    });
  } catch (error) {
    if (
      error.code === 11000
    ) {
      return res.status(409).json({
        success: false,
        message:
          "Income number already exists",
      });
    }

    next(error);
  }
};

/*
|--------------------------------------------------------------------------
| DELETE INCOME
|--------------------------------------------------------------------------
*/

const deleteIncome = async (
  req,
  res,
  next
) => {
  try {
    const {
      id,
    } = req.params;

    const companyId =
      req.query.companyId ||
      req.body.companyId;

    if (
      !isValidObjectId(id)
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Invalid income ID",
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

    const income =
      await Income.findOne({
        _id: id,
        company: companyId,
        isActive: true,
      });

    if (!income) {
      return res.status(404).json({
        success: false,
        message:
          "Income record not found",
      });
    }

    income.isActive =
      false;

    income.updatedBy =
      req.user.userId;

    await income.save();

    return res.status(200).json({
      success: true,
      message:
        "Income deleted successfully",
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  createIncome,
  getIncomes,
  getIncomeById,
  updateIncome,
  deleteIncome,
};