const mongoose = require("mongoose");

const Receipt = require("../models/Receipt");
const Company = require("../models/Company");
const Branch = require("../models/Branch");
const FinancialYear = require("../models/FinancialYear");
const Account = require("../models/Account");
const Customer = require("../models/Customer");

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

const validateCompanyContext = async (
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
      error: "Invalid financial year ID",
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

const validateReceiptAccount = async (
  receiptAccountId,
  companyId,
  paymentMode
) => {
  if (!receiptAccountId) {
    return {
      error:
        "Receipt account is required",
    };
  }

  if (
    !isValidObjectId(
      receiptAccountId
    )
  ) {
    return {
      error:
        "Invalid receipt account ID",
    };
  }

  const receiptAccount =
    await Account.findOne({
      _id: receiptAccountId,
      company: companyId,
      isActive: {
        $ne: false,
      },
    }).lean();

  if (!receiptAccount) {
    return {
      error:
        "Receipt account not found for this company",
    };
  }

  const accountType = String(
    receiptAccount.accountType || ""
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
        "Selected receipt account must be a bank or cash account",
    };
  }

  return receiptAccount;
};

const validateCustomer = async (
  customerId,
  companyId
) => {
  if (!customerId) {
    return null;
  }

  if (!isValidObjectId(customerId)) {
    return {
      error: "Invalid customer ID",
    };
  }

  const customer =
    await Customer.findOne({
      _id: customerId,
      company: companyId,
    }).lean();

  if (!customer) {
    return {
      error:
        "Customer not found for this company",
    };
  }

  return customer;
};

const generateReceiptNumber =
  async (
    companyId,
    financialYearId
  ) => {
    const lastReceipt =
      await Receipt.findOne({
        company: companyId,
        financialYear:
          financialYearId,
      })
        .sort({
          createdAt: -1,
        })
        .select("receiptNumber")
        .lean();

    if (
      !lastReceipt ||
      !lastReceipt.receiptNumber
    ) {
      return "REC-00001";
    }

    const match =
      String(
        lastReceipt.receiptNumber
      ).match(/(\d+)$/);

    if (!match) {
      return "REC-00001";
    }

    const nextNumber =
      Number(match[1]) + 1;

    return `REC-${String(
      nextNumber
    ).padStart(5, "0")}`;
  };

const validateReceiptFields = ({
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
| CREATE RECEIPT
|--------------------------------------------------------------------------
*/

const createReceipt = async (
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
      customerId,
      receiptAccountId,
      receiptNumber,
      receiptDate,
      amount,
      paymentMode = "cash",
      chequeNumber = "",
      chequeDate = null,
      bankName = "",
      referenceNumber = "",
      narration = "",
      notes = "",
    } = req.body;

    if (
      !companyId ||
      !financialYearId
    ) {
      return res.status(400).json({
        success: false,
        message:
          "companyId and financialYearId are required",
      });
    }

    const context =
      await validateCompanyContext(
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

    const account =
      await validateAccount(
        accountId,
        companyId
      );

    if (account.error) {
      return res.status(400).json({
        success: false,
        message: account.error,
      });
    }

    const customer =
      await validateCustomer(
        customerId,
        companyId
      );

    if (
      customer &&
      customer.error
    ) {
      return res.status(400).json({
        success: false,
        message: customer.error,
      });
    }

    const receiptAccount =
      await validateReceiptAccount(
        receiptAccountId,
        companyId,
        paymentMode
      );

    if (
      receiptAccount.error
    ) {
      return res.status(400).json({
        success: false,
        message:
          receiptAccount.error,
      });
    }

    const fieldValidation =
      validateReceiptFields({
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

    const parsedReceiptDate =
      parseDate(receiptDate);

    if (!parsedReceiptDate) {
      return res.status(400).json({
        success: false,
        message:
          "Valid receiptDate is required",
      });
    }

    if (
      parsedReceiptDate <
        new Date(
          context.financialYear.startDate
        ) ||
      parsedReceiptDate >
        new Date(
          context.financialYear.endDate
        )
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Receipt date must be within the selected financial year",
      });
    }

    let finalReceiptNumber =
      receiptNumber;

    if (
      !finalReceiptNumber ||
      !String(
        finalReceiptNumber
      ).trim()
    ) {
      finalReceiptNumber =
        await generateReceiptNumber(
          companyId,
          financialYearId
        );
    }

    finalReceiptNumber =
      String(
        finalReceiptNumber
      )
        .trim()
        .toUpperCase();

    const existingReceipt =
      await Receipt.findOne({
        company: companyId,
        financialYear:
          financialYearId,
        receiptNumber:
          finalReceiptNumber,
      }).lean();

    if (existingReceipt) {
      return res.status(409).json({
        success: false,
        message:
          "Receipt number already exists",
      });
    }

    const receipt =
      await Receipt.create({
        company: companyId,
        branch:
          branchId || null,
        financialYear:
          financialYearId,
        account:
          account._id,
        customer:
          customer
            ? customer._id
            : null,
        receiptAccount:
          receiptAccount._id,
        receiptNumber:
          finalReceiptNumber,
        receiptDate:
          parsedReceiptDate,
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

    const populatedReceipt =
      await Receipt.findById(
        receipt._id
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
          "customer",
          "name phone email"
        )
        .populate(
          "receiptAccount",
          "name accountCode accountType"
        );

    return res.status(201).json({
      success: true,
      message:
        "Receipt created successfully",
      receipt:
        populatedReceipt,
    });
  } catch (error) {
    if (
      error.code === 11000
    ) {
      return res.status(409).json({
        success: false,
        message:
          "Receipt number already exists",
      });
    }

    next(error);
  }
};

/*
|--------------------------------------------------------------------------
| GET ALL RECEIPTS
|--------------------------------------------------------------------------
*/

const getReceipts = async (
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
      customerId,
      receiptAccountId,
      paymentMode,
      fromDate,
      toDate,
      search,
      page = 1,
      limit = 50,
    } = req.query;

    const context =
      await validateCompanyContext(
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

    if (customerId) {
      if (
        !isValidObjectId(
          customerId
        )
      ) {
        return res.status(400).json({
          success: false,
          message:
            "Invalid customer ID",
        });
      }

      filter.customer =
        customerId;
    }

    if (receiptAccountId) {
      if (
        !isValidObjectId(
          receiptAccountId
        )
      ) {
        return res.status(400).json({
          success: false,
          message:
            "Invalid receipt account ID",
        });
      }

      filter.receiptAccount =
        receiptAccountId;
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
      filter.receiptDate = {};

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

        filter.receiptDate.$gte =
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

        filter.receiptDate.$lte =
          to;
      }
    }

    if (search) {
      const value =
        String(search)
          .trim();

      filter.$or = [
        {
          receiptNumber: {
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
      receipts,
      totalRecords,
    ] = await Promise.all([
      Receipt.find(filter)
        .populate(
          "account",
          "name accountCode accountType"
        )
        .populate(
          "customer",
          "name phone email"
        )
        .populate(
          "receiptAccount",
          "name accountCode accountType"
        )
        .populate(
          "branch",
          "name code"
        )
        .sort({
          receiptDate: -1,
          createdAt: -1,
        })
        .skip(skip)
        .limit(limitNumber)
        .lean(),

      Receipt.countDocuments(
        filter
      ),
    ]);

    const totalAmount =
      receipts.reduce(
        (sum, receipt) =>
          sum +
          Number(
            receipt.amount || 0
          ),
        0
      );

    return res.status(200).json({
      success: true,
      message:
        "Receipts fetched successfully",
      data: {
        receipts,
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
          customerId:
            customerId || null,
          receiptAccountId:
            receiptAccountId ||
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
| GET RECEIPT BY ID
|--------------------------------------------------------------------------
*/

const getReceiptById = async (
  req,
  res,
  next
) => {
  try {
    const {
      id,
      companyId,
      financialYearId,
    } = {
      id: req.params.id,
      companyId:
        req.query.companyId ||
        req.body.companyId,
      financialYearId:
        req.query.financialYearId ||
        req.body.financialYearId,
    };

    if (
      !isValidObjectId(id)
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Invalid receipt ID",
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

    const receipt =
      await Receipt.findOne(
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
          "customer",
          "name phone email address"
        )
        .populate(
          "receiptAccount",
          "name accountCode accountType"
        )
        .lean();

    if (!receipt) {
      return res.status(404).json({
        success: false,
        message:
          "Receipt not found",
      });
    }

    return res.status(200).json({
      success: true,
      message:
        "Receipt fetched successfully",
      receipt,
    });
  } catch (error) {
    next(error);
  }
};

/*
|--------------------------------------------------------------------------
| UPDATE RECEIPT
|--------------------------------------------------------------------------
*/

const updateReceipt = async (
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
      customerId,
      receiptAccountId,
      receiptNumber,
      receiptDate,
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
          "Invalid receipt ID",
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

    const receipt =
      await Receipt.findOne({
        _id: id,
        company: companyId,
        isActive: true,
      });

    if (!receipt) {
      return res.status(404).json({
        success: false,
        message:
          "Receipt not found",
      });
    }

    const finalPaymentMode =
      paymentMode ||
      receipt.paymentMode;

    const finalAccountId =
      accountId ||
      receipt.account.toString();

    const finalReceiptAccountId =
      receiptAccountId ||
      receipt.receiptAccount.toString();

    const account =
      await validateAccount(
        finalAccountId,
        companyId
      );

    if (account.error) {
      return res.status(400).json({
        success: false,
        message: account.error,
      });
    }

    const receiptAccount =
      await validateReceiptAccount(
        finalReceiptAccountId,
        companyId,
        finalPaymentMode
      );

    if (
      receiptAccount.error
    ) {
      return res.status(400).json({
        success: false,
        message:
          receiptAccount.error,
      });
    }

    let customer = null;

    if (
      customerId !== undefined
    ) {
      customer =
        await validateCustomer(
          customerId,
          companyId
        );

      if (
        customer &&
        customer.error
      ) {
        return res.status(400).json({
          success: false,
          message:
            customer.error,
        });
      }
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

      receipt.branch =
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

      receipt.amount =
        round2(amount);
    }

    if (paymentMode !== undefined) {
      receipt.paymentMode =
        paymentMode;
    }

    const fieldValidation =
      validateReceiptFields({
        amount:
          receipt.amount,
        paymentMode:
          finalPaymentMode,
        chequeNumber:
          chequeNumber !==
          undefined
            ? chequeNumber
            : receipt.chequeNumber,
        chequeDate:
          chequeDate !==
          undefined
            ? chequeDate
            : receipt.chequeDate,
        bankName:
          bankName !==
          undefined
            ? bankName
            : receipt.bankName,
      });

    if (fieldValidation) {
      return res.status(400).json({
        success: false,
        message:
          fieldValidation.error,
      });
    }

    if (
      receiptDate !== undefined
    ) {
      const parsedDate =
        parseDate(receiptDate);

      if (!parsedDate) {
        return res.status(400).json({
          success: false,
          message:
            "Invalid receiptDate",
        });
      }

      receipt.receiptDate =
        parsedDate;
    }

    if (
      receiptNumber !==
      undefined
    ) {
      const finalNumber =
        String(
          receiptNumber
        )
          .trim()
          .toUpperCase();

      if (!finalNumber) {
        return res.status(400).json({
          success: false,
          message:
            "Receipt number cannot be empty",
        });
      }

      const duplicate =
        await Receipt.findOne({
          _id: {
            $ne: id,
          },
          company: companyId,
          financialYear:
            receipt.financialYear,
          receiptNumber:
            finalNumber,
        }).lean();

      if (duplicate) {
        return res.status(409).json({
          success: false,
          message:
            "Receipt number already exists",
        });
      }

      receipt.receiptNumber =
        finalNumber;
    }

    receipt.account =
      account._id;

    receipt.receiptAccount =
      receiptAccount._id;

    if (
      customerId !== undefined
    ) {
      receipt.customer =
        customer
          ? customer._id
          : null;
    }

    if (
      chequeNumber !==
      undefined
    ) {
      receipt.chequeNumber =
        chequeNumber || "";
    }

    if (
      chequeDate !==
      undefined
    ) {
      receipt.chequeDate =
        chequeDate
          ? parseDate(
              chequeDate
            )
          : null;
    }

    if (
      bankName !== undefined
    ) {
      receipt.bankName =
        bankName || "";
    }

    if (
      referenceNumber !==
      undefined
    ) {
      receipt.referenceNumber =
        referenceNumber || "";
    }

    if (
      narration !== undefined
    ) {
      receipt.narration =
        narration || "";
    }

    if (notes !== undefined) {
      receipt.notes =
        notes || "";
    }

    receipt.updatedBy =
      req.user.userId;

    await receipt.save();

    const populatedReceipt =
      await Receipt.findById(
        receipt._id
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
          "customer",
          "name phone email"
        )
        .populate(
          "receiptAccount",
          "name accountCode accountType"
        );

    return res.status(200).json({
      success: true,
      message:
        "Receipt updated successfully",
      receipt:
        populatedReceipt,
    });
  } catch (error) {
    if (
      error.code === 11000
    ) {
      return res.status(409).json({
        success: false,
        message:
          "Receipt number already exists",
      });
    }

    next(error);
  }
};

/*
|--------------------------------------------------------------------------
| DELETE RECEIPT
|--------------------------------------------------------------------------
*/

const deleteReceipt = async (
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
          "Invalid receipt ID",
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

    const receipt =
      await Receipt.findOne({
        _id: id,
        company: companyId,
        isActive: true,
      });

    if (!receipt) {
      return res.status(404).json({
        success: false,
        message:
          "Receipt not found",
      });
    }

    receipt.isActive =
      false;

    receipt.updatedBy =
      req.user.userId;

    await receipt.save();

    return res.status(200).json({
      success: true,
      message:
        "Receipt deleted successfully",
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  createReceipt,
  getReceipts,
  getReceiptById,
  updateReceipt,
  deleteReceipt,
};