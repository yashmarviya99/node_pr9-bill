const mongoose = require("mongoose");

const Journal = require("../models/Journal");
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

const generateJournalNumber = async (
  companyId,
  financialYearId
) => {
  const lastJournal =
    await Journal.findOne({
      company: companyId,
      financialYear: financialYearId,
    })
      .sort({
        createdAt: -1,
      })
      .select("journalNumber")
      .lean();

  if (
    !lastJournal ||
    !lastJournal.journalNumber
  ) {
    return "JRN-00001";
  }

  const match = String(
    lastJournal.journalNumber
  ).match(/(\d+)$/);

  if (!match) {
    return "JRN-00001";
  }

  const nextNumber =
    Number(match[1]) + 1;

  return `JRN-${String(
    nextNumber
  ).padStart(5, "0")}`;
};

const validateJournalFields = ({
  debitAccountId,
  creditAccountId,
  amount,
}) => {
  if (
    !debitAccountId ||
    !creditAccountId
  ) {
    return {
      error:
        "Debit account and credit account are required",
    };
  }

  if (
    String(debitAccountId) ===
    String(creditAccountId)
  ) {
    return {
      error:
        "Debit account and credit account cannot be the same",
    };
  }

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

  return null;
};

/*
|--------------------------------------------------------------------------
| CREATE JOURNAL
|--------------------------------------------------------------------------
*/

const createJournal = async (
  req,
  res,
  next
) => {
  try {
    const {
      companyId,
      branchId,
      financialYearId,
      debitAccountId,
      creditAccountId,
      journalNumber,
      journalDate,
      amount,
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

    const fieldValidation =
      validateJournalFields({
        debitAccountId,
        creditAccountId,
        amount,
      });

    if (fieldValidation) {
      return res.status(400).json({
        success: false,
        message:
          fieldValidation.error,
      });
    }

    const debitAccount =
      await validateAccount(
        debitAccountId,
        companyId
      );

    if (debitAccount.error) {
      return res.status(400).json({
        success: false,
        message:
          debitAccount.error,
      });
    }

    const creditAccount =
      await validateAccount(
        creditAccountId,
        companyId
      );

    if (creditAccount.error) {
      return res.status(400).json({
        success: false,
        message:
          creditAccount.error,
      });
    }

    const parsedJournalDate =
      parseDate(journalDate);

    if (!parsedJournalDate) {
      return res.status(400).json({
        success: false,
        message:
          "Valid journalDate is required",
      });
    }

    const financialYearStart =
      new Date(
        context.financialYear.startDate
      );

    const financialYearEnd =
      new Date(
        context.financialYear.endDate
      );

    if (
      parsedJournalDate <
        financialYearStart ||
      parsedJournalDate >
        financialYearEnd
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Journal date must be within the selected financial year",
      });
    }

    let finalJournalNumber =
      journalNumber;

    if (
      !finalJournalNumber ||
      !String(
        finalJournalNumber
      ).trim()
    ) {
      finalJournalNumber =
        await generateJournalNumber(
          companyId,
          financialYearId
        );
    }

    finalJournalNumber =
      String(
        finalJournalNumber
      )
        .trim()
        .toUpperCase();

    const existingJournal =
      await Journal.findOne({
        company: companyId,
        financialYear:
          financialYearId,
        journalNumber:
          finalJournalNumber,
      }).lean();

    if (existingJournal) {
      return res.status(409).json({
        success: false,
        message:
          "Journal number already exists",
      });
    }

    const journal =
      await Journal.create({
        company: companyId,
        branch:
          branchId || null,
        financialYear:
          financialYearId,
        debitAccount:
          debitAccount._id,
        creditAccount:
          creditAccount._id,
        journalNumber:
          finalJournalNumber,
        journalDate:
          parsedJournalDate,
        amount: round2(amount),
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

    const populatedJournal =
      await Journal.findById(
        journal._id
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
          "debitAccount",
          "name accountCode accountType openingBalance openingBalanceType"
        )
        .populate(
          "creditAccount",
          "name accountCode accountType openingBalance openingBalanceType"
        );

    return res.status(201).json({
      success: true,
      message:
        "Journal created successfully",
      journal:
        populatedJournal,
    });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(409).json({
        success: false,
        message:
          "Journal number already exists",
      });
    }

    next(error);
  }
};

/*
|--------------------------------------------------------------------------
| GET JOURNAL LIST
|--------------------------------------------------------------------------
*/

const getJournals = async (
  req,
  res,
  next
) => {
  try {
    const {
      companyId,
      branchId,
      financialYearId,
      debitAccountId,
      creditAccountId,
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

    if (debitAccountId) {
      if (
        !isValidObjectId(
          debitAccountId
        )
      ) {
        return res.status(400).json({
          success: false,
          message:
            "Invalid debit account ID",
        });
      }

      filter.debitAccount =
        debitAccountId;
    }

    if (creditAccountId) {
      if (
        !isValidObjectId(
          creditAccountId
        )
      ) {
        return res.status(400).json({
          success: false,
          message:
            "Invalid credit account ID",
        });
      }

      filter.creditAccount =
        creditAccountId;
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
      filter.journalDate = {};

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

        filter.journalDate.$gte =
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

        filter.journalDate.$lte =
          to;
      }
    }

    if (search) {
      const value =
        String(search).trim();

      filter.$or = [
        {
          journalNumber: {
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
      journals,
      totalRecords,
    ] = await Promise.all([
      Journal.find(filter)
        .populate(
          "debitAccount",
          "name accountCode accountType"
        )
        .populate(
          "creditAccount",
          "name accountCode accountType"
        )
        .populate(
          "branch",
          "name code"
        )
        .sort({
          journalDate: -1,
          createdAt: -1,
        })
        .skip(skip)
        .limit(limitNumber)
        .lean(),

      Journal.countDocuments(
        filter
      ),
    ]);

    const totalAmount =
      journals.reduce(
        (sum, journal) =>
          sum +
          Number(
            journal.amount || 0
          ),
        0
      );

    return res.status(200).json({
      success: true,
      message:
        "Journal records fetched successfully",
      data: {
        journals,
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
          debitAccountId:
            debitAccountId || null,
          creditAccountId:
            creditAccountId || null,
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
| GET JOURNAL BY ID
|--------------------------------------------------------------------------
*/

const getJournalById = async (
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
          "Invalid journal ID",
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

    const journal =
      await Journal.findOne(filter)
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
          "debitAccount",
          "name accountCode accountType openingBalance openingBalanceType"
        )
        .populate(
          "creditAccount",
          "name accountCode accountType openingBalance openingBalanceType"
        )
        .lean();

    if (!journal) {
      return res.status(404).json({
        success: false,
        message:
          "Journal record not found",
      });
    }

    return res.status(200).json({
      success: true,
      message:
        "Journal record fetched successfully",
      journal,
    });
  } catch (error) {
    next(error);
  }
};

/*
|--------------------------------------------------------------------------
| UPDATE JOURNAL
|--------------------------------------------------------------------------
*/

const updateJournal = async (
  req,
  res,
  next
) => {
  try {
    const { id } = req.params;

    const {
      companyId,
      branchId,
      debitAccountId,
      creditAccountId,
      journalNumber,
      journalDate,
      amount,
      referenceNumber,
      narration,
      notes,
    } = req.body;

    if (!isValidObjectId(id)) {
      return res.status(400).json({
        success: false,
        message:
          "Invalid journal ID",
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

    const journal =
      await Journal.findOne({
        _id: id,
        company: companyId,
        isActive: true,
      });

    if (!journal) {
      return res.status(404).json({
        success: false,
        message:
          "Journal record not found",
      });
    }

    const finalDebitAccountId =
      debitAccountId ||
      journal.debitAccount.toString();

    const finalCreditAccountId =
      creditAccountId ||
      journal.creditAccount.toString();

    const fieldValidation =
      validateJournalFields({
        debitAccountId:
          finalDebitAccountId,
        creditAccountId:
          finalCreditAccountId,
        amount:
          amount !== undefined
            ? amount
            : journal.amount,
      });

    if (fieldValidation) {
      return res.status(400).json({
        success: false,
        message:
          fieldValidation.error,
      });
    }

    const debitAccount =
      await validateAccount(
        finalDebitAccountId,
        companyId
      );

    if (debitAccount.error) {
      return res.status(400).json({
        success: false,
        message:
          debitAccount.error,
      });
    }

    const creditAccount =
      await validateAccount(
        finalCreditAccountId,
        companyId
      );

    if (creditAccount.error) {
      return res.status(400).json({
        success: false,
        message:
          creditAccount.error,
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

      journal.branch =
        branchId || null;
    }

    if (amount !== undefined) {
      journal.amount =
        round2(amount);
    }

    if (
      journalDate !== undefined
    ) {
      const parsedDate =
        parseDate(journalDate);

      if (!parsedDate) {
        return res.status(400).json({
          success: false,
          message:
            "Invalid journalDate",
        });
      }

      journal.journalDate =
        parsedDate;
    }

    const financialYear =
      await getFinancialYear(
        journal.financialYear,
        companyId
      );

    if (!financialYear) {
      return res.status(400).json({
        success: false,
        message:
          "Financial year not found",
      });
    }

    if (
      journal.journalDate <
        new Date(
          financialYear.startDate
        ) ||
      journal.journalDate >
        new Date(
          financialYear.endDate
        )
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Journal date must be within the selected financial year",
      });
    }

    if (
      journalNumber !==
      undefined
    ) {
      const finalNumber =
        String(
          journalNumber
        )
          .trim()
          .toUpperCase();

      if (!finalNumber) {
        return res.status(400).json({
          success: false,
          message:
            "Journal number cannot be empty",
        });
      }

      const duplicate =
        await Journal.findOne({
          _id: {
            $ne: id,
          },
          company: companyId,
          financialYear:
            journal.financialYear,
          journalNumber:
            finalNumber,
        }).lean();

      if (duplicate) {
        return res.status(409).json({
          success: false,
          message:
            "Journal number already exists",
        });
      }

      journal.journalNumber =
        finalNumber;
    }

    journal.debitAccount =
      debitAccount._id;

    journal.creditAccount =
      creditAccount._id;

    if (
      referenceNumber !==
      undefined
    ) {
      journal.referenceNumber =
        referenceNumber || "";
    }

    if (
      narration !== undefined
    ) {
      journal.narration =
        narration || "";
    }

    if (notes !== undefined) {
      journal.notes =
        notes || "";
    }

    journal.updatedBy =
      req.user.userId;

    await journal.save();

    const populatedJournal =
      await Journal.findById(
        journal._id
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
          "debitAccount",
          "name accountCode accountType"
        )
        .populate(
          "creditAccount",
          "name accountCode accountType"
        );

    return res.status(200).json({
      success: true,
      message:
        "Journal updated successfully",
      journal:
        populatedJournal,
    });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(409).json({
        success: false,
        message:
          "Journal number already exists",
      });
    }

    next(error);
  }
};

/*
|--------------------------------------------------------------------------
| DELETE JOURNAL
|--------------------------------------------------------------------------
*/

const deleteJournal = async (
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
          "Invalid journal ID",
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

    const journal =
      await Journal.findOne({
        _id: id,
        company: companyId,
        isActive: true,
      });

    if (!journal) {
      return res.status(404).json({
        success: false,
        message:
          "Journal record not found",
      });
    }

    journal.isActive = false;

    journal.updatedBy =
      req.user.userId;

    await journal.save();

    return res.status(200).json({
      success: true,
      message:
        "Journal deleted successfully",
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  createJournal,
  getJournals,
  getJournalById,
  updateJournal,
  deleteJournal,
};