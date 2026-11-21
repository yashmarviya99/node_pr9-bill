const {
  quotationCreateSchema,
} = require("../validators/quotationValidator");

const quotationService = require("../services/quotationService");

const {
  generateQuotationPdf,
} = require("../templates/quotation/quotationPdf");

const createQuotation = async (
  req,
  res,
  next
) => {
  try {
    const data =
      quotationCreateSchema.parse(
        req.body
      );

    const quotation =
      await quotationService.createQuotation(
        data,
        req.user.userId
      );

    const populated =
      await quotationService.getQuotationForOwner(
        quotation._id,
        req.user.userId
      );

    res.status(201).json({
      success: true,
      message:
        "Quotation created successfully",
      quotation: populated,
    });
  } catch (error) {
    next(error);
  }
};

const getQuotations = async (
  req,
  res,
  next
) => {
  try {
    const {
      companyId,
      branchId,
      financialYearId,
      status,
      fromDate,
      toDate,
      search,
      page = 1,
      limit = 50,
    } = req.query;

    if (!companyId) {
      return res.status(400).json({
        success: false,
        message:
          "companyId query parameter is required",
      });
    }

    const result =
      await quotationService.listQuotations(
        {
          companyId,
          branchId,
          financialYearId,
          status,
          fromDate,
          toDate,
          search,
          page: Math.max(
            Number(page) || 1,
            1
          ),
          limit: Math.min(
            Math.max(
              Number(limit) || 50,
              1
            ),
            100
          ),
          userId: req.user.userId,
        }
      );

    res.status(200).json({
      success: true,
      ...result,
    });
  } catch (error) {
    next(error);
  }
};

const getQuotationById = async (
  req,
  res,
  next
) => {
  try {
    const quotation =
      await quotationService.getQuotationForOwner(
        req.params.id,
        req.user.userId
      );

    res.status(200).json({
      success: true,
      quotation,
    });
  } catch (error) {
    next(error);
  }
};

const updateQuotation = async (
  req,
  res,
  next
) => {
  try {
    const data =
      quotationCreateSchema
        .partial()
        .parse(req.body);

    const quotation =
      await quotationService.updateQuotation(
        req.params.id,
        data,
        req.user.userId
      );

    const populated =
      await quotationService.getQuotationForOwner(
        quotation._id,
        req.user.userId
      );

    res.status(200).json({
      success: true,
      message:
        "Quotation updated successfully",
      quotation: populated,
    });
  } catch (error) {
    next(error);
  }
};

const deleteQuotation = async (
  req,
  res,
  next
) => {
  try {
    await quotationService.deleteQuotation(
      req.params.id,
      req.user.userId
    );

    res.status(200).json({
      success: true,
      message:
        "Quotation deleted successfully",
    });
  } catch (error) {
    next(error);
  }
};

const getQuotationPdf = async (
  req,
  res,
  next
) => {
  try {
    const quotation =
      await quotationService.getQuotationForOwner(
        req.params.id,
        req.user.userId
      );

    res.setHeader(
      "Content-Type",
      "application/pdf"
    );

    res.setHeader(
      "Content-Disposition",
      `inline; filename="quotation-${quotation.quotationNumber}.pdf"`
    );

    generateQuotationPdf(
      quotation,
      res
    );
  } catch (error) {
    next(error);
  }
};

module.exports = {
  createQuotation,
  getQuotations,
  getQuotationById,
  updateQuotation,
  deleteQuotation,
  getQuotationPdf,
};