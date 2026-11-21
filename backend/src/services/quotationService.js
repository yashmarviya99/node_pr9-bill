const mongoose = require("mongoose");

const Quotation = require("../models/Quotation");
const Product = require("../models/Product");
const Company = require("../models/Company");
const Branch = require("../models/Branch");
const FinancialYear = require("../models/FinancialYear");
const Account = require("../models/Account");
const Customer = require("../models/Customer");

const round2 = (value) =>
  Math.round(
    (Number(value) + Number.EPSILON) * 100
  ) / 100;

const parseDate = (value, label) => {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    const error = new Error(`Invalid ${label}`);
    error.statusCode = 400;
    throw error;
  }

  return date;
};

const validateObjectId = (id, label) => {
  if (!mongoose.Types.ObjectId.isValid(id)) {
    const error = new Error(
      `Invalid ${label} ID`
    );

    error.statusCode = 400;

    throw error;
  }
};

const validateContext = async ({
  companyId,
  branchId,
  financialYearId,
  accountId,
  customerId,
  userId,
}) => {
  validateObjectId(companyId, "company");
  validateObjectId(
    financialYearId,
    "financial year"
  );
  validateObjectId(accountId, "account");

  if (branchId) {
    validateObjectId(branchId, "branch");
  }

  if (customerId) {
    validateObjectId(customerId, "customer");
  }

  const company = await Company.findOne({
    _id: companyId,
    owner: userId,
  });

  if (!company) {
    const error = new Error(
      "Company not found or access denied"
    );

    error.statusCode = 404;

    throw error;
  }

  if (branchId) {
    const branch = await Branch.findOne({
      _id: branchId,
      company: companyId,
    });

    if (!branch) {
      const error = new Error("Branch not found");

      error.statusCode = 404;

      throw error;
    }
  }

  const financialYear =
    await FinancialYear.findOne({
      _id: financialYearId,
      company: companyId,
    });

  if (!financialYear) {
    const error = new Error(
      "Financial year not found"
    );

    error.statusCode = 404;

    throw error;
  }

  const account = await Account.findOne({
    _id: accountId,
    company: companyId,
  });

  if (!account) {
    const error = new Error("Account not found");

    error.statusCode = 404;

    throw error;
  }

  let customer = null;

  if (customerId) {
    customer = await Customer.findOne({
      _id: customerId,
      company: companyId,
    });

    if (!customer) {
      const error = new Error(
        "Customer not found"
      );

      error.statusCode = 404;

      throw error;
    }
  }

  return {
    company,
    financialYear,
    customer,
  };
};

const buildItems = async ({
  items,
  companyId,
  taxType,
}) => {
  const productIds = [
    ...new Set(
      items.map((item) => item.productId)
    ),
  ];

  productIds.forEach((id) =>
    validateObjectId(id, "product")
  );

  const products = await Product.find({
    _id: {
      $in: productIds,
    },
    company: companyId,
    isActive: true,
  });

  const productMap = new Map(
    products.map((product) => [
      product._id.toString(),
      product,
    ])
  );

  if (products.length !== productIds.length) {
    const missing = productIds.find(
      (id) => !productMap.has(id)
    );

    const error = new Error(
      `Product ${missing} not found or inactive`
    );

    error.statusCode = 404;

    throw error;
  }

  let productAmount = 0;
  let discountAmount = 0;
  let taxableAmount = 0;
  let cgstAmount = 0;
  let sgstAmount = 0;
  let igstAmount = 0;

  const quotationItems = items.map(
    (input) => {
      const product = productMap.get(
        input.productId
      );

      const amount = round2(
        input.quantity * input.rate
      );

      const discount = round2(
        (amount *
          (input.discountPercent || 0)) /
          100
      );

      const taxable = round2(
        amount - discount
      );

      const gstRate =
        input.gstRate === undefined
          ? Number(product.gstRate || 0)
          : input.gstRate;

      let cgstPercent = 0;
      let sgstPercent = 0;
      let igstPercent = 0;

      let itemCgst = 0;
      let itemSgst = 0;
      let itemIgst = 0;

      if (taxType === "igst") {
        igstPercent = gstRate;

        itemIgst = round2(
          (taxable * gstRate) / 100
        );
      } else {
        cgstPercent = gstRate / 2;
        sgstPercent = gstRate / 2;

        itemCgst = round2(
          (taxable * cgstPercent) / 100
        );

        itemSgst = round2(
          (taxable * sgstPercent) / 100
        );
      }

      const total = round2(
        taxable +
          itemCgst +
          itemSgst +
          itemIgst
      );

      productAmount += amount;
      discountAmount += discount;
      taxableAmount += taxable;
      cgstAmount += itemCgst;
      sgstAmount += itemSgst;
      igstAmount += itemIgst;

      return {
        product: product._id,

        productName: product.name,

        description:
          input.description ||
          product.description ||
          "",

        hsnSac: product.hsnSac || "",

        uom: product.unit || "PCS",

        quantity: input.quantity,

        rate: input.rate,

        amount,

        discountPercent:
          input.discountPercent || 0,

        discountAmount: discount,

        taxableAmount: taxable,

        gstRate,

        cgstPercent,

        cgstAmount: itemCgst,

        sgstPercent,

        sgstAmount: itemSgst,

        igstPercent,

        igstAmount: itemIgst,

        totalAmount: total,
      };
    }
  );

  return {
    items: quotationItems,

    productAmount: round2(
      productAmount
    ),

    discountAmount: round2(
      discountAmount
    ),

    taxableAmount: round2(
      taxableAmount
    ),

    cgstAmount: round2(
      cgstAmount
    ),

    sgstAmount: round2(
      sgstAmount
    ),

    igstAmount: round2(
      igstAmount
    ),
  };
};

const validateFinancialDates = (
  financialYear,
  quotationDate,
  validUntil
) => {
  if (
    financialYear.startDate &&
    quotationDate <
      new Date(financialYear.startDate)
  ) {
    const error = new Error(
      "Quotation date is before financial year start date"
    );

    error.statusCode = 400;

    throw error;
  }

  if (
    financialYear.endDate &&
    quotationDate >
      new Date(financialYear.endDate)
  ) {
    const error = new Error(
      "Quotation date is after financial year end date"
    );

    error.statusCode = 400;

    throw error;
  }

  if (
    validUntil &&
    validUntil < quotationDate
  ) {
    const error = new Error(
      "Valid until date cannot be before quotation date"
    );

    error.statusCode = 400;

    throw error;
  }
};

const createQuotation = async (
  data,
  userId
) => {
  const {
    companyId,
    branchId,
    financialYearId,
    accountId,
    customerId,
    quotationNumber,
    quotationDate,
    validUntil,
    status,
    taxType,
    items,
    transportAmount,
    labourAmount,
    roundOff,
    narration,
    termsAndConditions,
    notes,
  } = data;

  const { financialYear } =
    await validateContext({
      companyId,
      branchId,
      financialYearId,
      accountId,
      customerId,
      userId,
    });

  const parsedDate = parseDate(
    quotationDate,
    "quotation date"
  );

  const parsedValidUntil = validUntil
    ? parseDate(
        validUntil,
        "valid until date"
      )
    : null;

  validateFinancialDates(
    financialYear,
    parsedDate,
    parsedValidUntil
  );

  const normalizedNumber =
    quotationNumber
      .trim()
      .toUpperCase();

  const duplicate =
    await Quotation.findOne({
      company: companyId,
      financialYear: financialYearId,
      quotationNumber:
        normalizedNumber,
    });

  if (duplicate) {
    const error = new Error(
      "Quotation number already exists"
    );

    error.statusCode = 409;

    throw error;
  }

  const calculated =
    await buildItems({
      items,
      companyId,
      taxType,
    });

  const beforeRound = round2(
    calculated.taxableAmount +
      calculated.cgstAmount +
      calculated.sgstAmount +
      calculated.igstAmount +
      transportAmount +
      labourAmount
  );

  const totalAmount = round2(
    beforeRound + roundOff
  );

  return Quotation.create({
    company: companyId,

    branch: branchId || null,

    financialYear: financialYearId,

    account: accountId,

    customer: customerId || null,

    quotationNumber:
      normalizedNumber,

    quotationDate: parsedDate,

    validUntil:
      parsedValidUntil,

    status,

    taxType,

    items: calculated.items,

    productAmount:
      calculated.productAmount,

    discountAmount:
      calculated.discountAmount,

    taxableAmount:
      calculated.taxableAmount,

    cgstAmount:
      calculated.cgstAmount,

    sgstAmount:
      calculated.sgstAmount,

    igstAmount:
      calculated.igstAmount,

    transportAmount,

    labourAmount,

    roundOff,

    totalAmount,

    narration,

    termsAndConditions,

    notes,
  });
};

const getQuotationForOwner = async (
  id,
  userId
) => {
  validateObjectId(id, "quotation");

  const quotation =
    await Quotation.findById(id)
      .populate(
        "company",
        "companyName email phone address city state pincode gstNumber panNumber logo"
      )
      .populate(
        "branch",
        "branchName address phone"
      )
      .populate(
        "financialYear",
        "name startDate endDate"
      )
      .populate(
        "account",
        "name accountType"
      )
      .populate(
        "customer",
        "name phone email address gstNumber"
      )
      .populate(
        "items.product",
        "name productCode unit hsnSac gstRate"
      );

  if (!quotation) {
    const error = new Error(
      "Quotation not found"
    );

    error.statusCode = 404;

    throw error;
  }

  const company =
    await Company.findOne({
      _id: quotation.company._id,
      owner: userId,
    });

  if (!company) {
    const error = new Error(
      "You are not allowed to access this quotation"
    );

    error.statusCode = 403;

    throw error;
  }

  return quotation;
};

const getQuotation = async (
  id,
  userId
) => {
  validateObjectId(id, "quotation");

  const quotation =
    await Quotation.findById(id);

  if (!quotation) {
    const error = new Error(
      "Quotation not found"
    );

    error.statusCode = 404;

    throw error;
  }

  const company =
    await Company.findOne({
      _id: quotation.company,
      owner: userId,
    });

  if (!company) {
    const error = new Error(
      "You are not allowed to access this quotation"
    );

    error.statusCode = 403;

    throw error;
  }

  return quotation;
};

const listQuotations = async ({
  companyId,
  branchId,
  financialYearId,
  status,
  fromDate,
  toDate,
  search,
  page,
  limit,
  userId,
}) => {
  validateObjectId(
    companyId,
    "company"
  );

  const company =
    await Company.findOne({
      _id: companyId,
      owner: userId,
    });

  if (!company) {
    const error = new Error(
      "Company not found or access denied"
    );

    error.statusCode = 404;

    throw error;
  }

  const filter = {
    company: companyId,
  };

  if (branchId) {
    validateObjectId(
      branchId,
      "branch"
    );

    filter.branch = branchId;
  }

  if (financialYearId) {
    validateObjectId(
      financialYearId,
      "financial year"
    );

    filter.financialYear =
      financialYearId;
  }

  if (status) {
    filter.status = status;
  }

  if (fromDate || toDate) {
    filter.quotationDate = {};

    if (fromDate) {
      filter.quotationDate.$gte =
        parseDate(
          fromDate,
          "from date"
        );
    }

    if (toDate) {
      filter.quotationDate.$lte =
        parseDate(
          toDate,
          "to date"
        );
    }
  }

  if (search) {
    filter.quotationNumber = {
      $regex: search.trim(),
      $options: "i",
    };
  }

  const skip =
    (page - 1) * limit;

  const [
    quotations,
    total,
  ] = await Promise.all([
    Quotation.find(filter)
      .populate(
        "account",
        "name accountType"
      )
      .populate(
        "customer",
        "name phone email"
      )
      .populate(
        "branch",
        "branchName"
      )
      .sort({
        quotationDate: -1,
        createdAt: -1,
      })
      .skip(skip)
      .limit(limit),

    Quotation.countDocuments(
      filter
    ),
  ]);

  return {
    quotations,

    pagination: {
      page,
      limit,
      total,
      pages: Math.ceil(
        total / limit
      ),
    },
  };
};

const updateQuotation = async (
  id,
  data,
  userId
) => {
  const existing =
    await getQuotation(
      id,
      userId
    );

  const payload = {
    ...data,
    companyId:
      existing.company.toString(),
  };

  if (!payload.branchId) {
    payload.branchId =
      existing.branch
        ? existing.branch.toString()
        : "";
  }

  if (!payload.financialYearId) {
    payload.financialYearId =
      existing.financialYear.toString();
  }

  if (!payload.accountId) {
    payload.accountId =
      existing.account.toString();
  }

  if (!payload.customerId) {
    payload.customerId =
      existing.customer
        ? existing.customer.toString()
        : "";
  }

  if (!payload.quotationNumber) {
    payload.quotationNumber =
      existing.quotationNumber;
  }

  if (!payload.quotationDate) {
    payload.quotationDate =
      new Date(
        existing.quotationDate
      )
        .toISOString()
        .slice(0, 10);
  }

  if (
    payload.validUntil ===
    undefined
  ) {
    payload.validUntil =
      existing.validUntil
        ? new Date(
            existing.validUntil
          )
            .toISOString()
            .slice(0, 10)
        : "";
  }

  if (!payload.items) {
    payload.items =
      existing.items.map(
        (item) => ({
          productId:
            item.product.toString(),

          quantity:
            item.quantity,

          rate: item.rate,

          discountPercent:
            item.discountPercent,

          gstRate:
            item.gstRate,

          description:
            item.description,
        })
      );
  }

  if (
    payload.status ===
    undefined
  ) {
    payload.status =
      existing.status;
  }

  if (
    payload.taxType ===
    undefined
  ) {
    payload.taxType =
      existing.taxType;
  }

  if (
    payload.transportAmount ===
    undefined
  ) {
    payload.transportAmount =
      existing.transportAmount;
  }

  if (
    payload.labourAmount ===
    undefined
  ) {
    payload.labourAmount =
      existing.labourAmount;
  }

  if (
    payload.roundOff ===
    undefined
  ) {
    payload.roundOff =
      existing.roundOff;
  }

  if (
    payload.narration ===
    undefined
  ) {
    payload.narration =
      existing.narration;
  }

  if (
    payload.termsAndConditions ===
    undefined
  ) {
    payload.termsAndConditions =
      existing.termsAndConditions;
  }

  if (
    payload.notes ===
    undefined
  ) {
    payload.notes =
      existing.notes;
  }

  const {
    quotationCreateSchema,
  } = require(
    "../validators/quotationValidator"
  );

  const normalized =
    await quotationCreateSchema.parseAsync(
      payload
    );

  const {
    financialYear,
  } = await validateContext({
    companyId:
      normalized.companyId,

    branchId:
      normalized.branchId,

    financialYearId:
      normalized.financialYearId,

    accountId:
      normalized.accountId,

    customerId:
      normalized.customerId,

    userId,
  });

  const parsedDate =
    parseDate(
      normalized.quotationDate,
      "quotation date"
    );

  const parsedValidUntil =
    normalized.validUntil
      ? parseDate(
          normalized.validUntil,
          "valid until date"
        )
      : null;

  validateFinancialDates(
    financialYear,
    parsedDate,
    parsedValidUntil
  );

  const duplicate =
    await Quotation.findOne({
      company:
        normalized.companyId,

      financialYear:
        normalized.financialYearId,

      quotationNumber:
        normalized.quotationNumber.toUpperCase(),

      _id: {
        $ne: id,
      },
    });

  if (duplicate) {
    const error = new Error(
      "Quotation number already exists"
    );

    error.statusCode = 409;

    throw error;
  }

  const calculated =
    await buildItems({
      items: normalized.items,

      companyId:
        normalized.companyId,

      taxType:
        normalized.taxType,
    });

  const beforeRound =
    round2(
      calculated.taxableAmount +
        calculated.cgstAmount +
        calculated.sgstAmount +
        calculated.igstAmount +
        normalized.transportAmount +
        normalized.labourAmount
    );

  const totalAmount =
    round2(
      beforeRound +
        normalized.roundOff
    );

  Object.assign(existing, {
    branch:
      normalized.branchId || null,

    financialYear:
      normalized.financialYearId,

    account:
      normalized.accountId,

    customer:
      normalized.customerId || null,

    quotationNumber:
      normalized.quotationNumber.toUpperCase(),

    quotationDate:
      parsedDate,

    validUntil:
      parsedValidUntil,

    status:
      normalized.status,

    taxType:
      normalized.taxType,

    items:
      calculated.items,

    productAmount:
      calculated.productAmount,

    discountAmount:
      calculated.discountAmount,

    taxableAmount:
      calculated.taxableAmount,

    cgstAmount:
      calculated.cgstAmount,

    sgstAmount:
      calculated.sgstAmount,

    igstAmount:
      calculated.igstAmount,

    transportAmount:
      normalized.transportAmount,

    labourAmount:
      normalized.labourAmount,

    roundOff:
      normalized.roundOff,

    totalAmount,

    narration:
      normalized.narration,

    termsAndConditions:
      normalized.termsAndConditions,

    notes:
      normalized.notes,
  });

  return existing.save();
};

const deleteQuotation = async (
  id,
  userId
) => {
  const quotation =
    await getQuotation(
      id,
      userId
    );

  await Quotation.findByIdAndDelete(
    quotation._id
  );
};

module.exports = {
  createQuotation,
  getQuotation,
  getQuotationForOwner,
  listQuotations,
  updateQuotation,
  deleteQuotation,
};