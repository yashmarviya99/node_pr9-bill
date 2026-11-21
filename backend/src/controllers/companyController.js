const mongoose = require("mongoose");

const User = require("../models/User");
const Company = require("../models/Company");
const Branch = require("../models/Branch");
const FinancialYear = require("../models/FinancialYear");

const {
  companyCreateSchema,
  companyUpdateSchema,
} = require("../validators/companyValidator");

const {
  branchCreateSchema,
} = require("../validators/branchValidator");

/*
|--------------------------------------------------------------------------
| Helper: Current Financial Year
|--------------------------------------------------------------------------
|
| Financial Year:
| 1 April -> 31 March
|
| Example:
| April 2026 to March 2027
| => FY 2026-27
|
|--------------------------------------------------------------------------
*/

const getCurrentFinancialYear = () => {
  const now = new Date();

  const currentYear =
    now.getUTCFullYear();

  const currentMonth =
    now.getUTCMonth();

  const startYear =
    currentMonth >= 3
      ? currentYear
      : currentYear - 1;

  const endYear =
    startYear + 1;

  const name =
    `FY ${startYear}-${String(
      endYear
    ).slice(-2)}`;

  const startDate = new Date(
    Date.UTC(
      startYear,
      3,
      1,
      0,
      0,
      0,
      0
    )
  );

  const endDate = new Date(
    Date.UTC(
      endYear,
      2,
      31,
      23,
      59,
      59,
      999
    )
  );

  return {
    name,
    startDate,
    endDate,
  };
};

/*
|--------------------------------------------------------------------------
| Create Company
|--------------------------------------------------------------------------
*/

const createCompany = async (
  req,
  res,
  next
) => {
  try {
    const validatedData =
      companyCreateSchema.parse(
        req.body
      );

    const company =
      await Company.create({
        ...validatedData,
        owner:
          req.user.userId,
      });

    // 1. Ensure Main Branch exists
    let mainBranch = await Branch.findOne({
      company: company._id,
      code: "MAIN",
    });

    if (!mainBranch) {
      mainBranch = await Branch.create({
        company: company._id,
        name: `${company.companyName} Main Branch`,
        code: "MAIN",
        email: company.email || "",
        phone: company.phone || "",
        address: company.address || "",
        city: company.city || "",
        state: company.state || "Gujarat",
        pincode: company.pincode || "",
        isMainBranch: true,
        isActive: true,
      });
    }

    // 2. Ensure current financial year exists
    const { name: fyName, startDate, endDate } = getCurrentFinancialYear();
    let currentFy = await FinancialYear.findOne({
      company: company._id,
      name: fyName,
    });

    if (!currentFy) {
      currentFy = await FinancialYear.create({
        company: company._id,
        name: fyName,
        startDate,
        endDate,
        isCurrent: true,
        isActive: true,
      });
    }

    const branches = await Branch.find({ company: company._id }).lean();
    const companyObj = company.toObject();
    companyObj.branches = branches;

    return res.status(201).json({
      success: true,
      message:
        "Company created successfully",
      company: companyObj,
    });
  } catch (error) {
    next(error);
  }
};

/*
|--------------------------------------------------------------------------
| Registration Company Setup
|--------------------------------------------------------------------------
|
| This API creates:
|
| 1. Company
| 2. Main Branch
| 3. Current Financial Year
|
| It is intended to be called after:
|
| Payment verified
| Registration active
| Subscription active
|
|--------------------------------------------------------------------------
*/

const setupCompany = async (
  req,
  res,
  next
) => {
  let createdCompany = null;
  let createdBranch = null;
  let createdFinancialYear = null;

  try {
    /*
    |--------------------------------------------------------------------------
    | 1. Validate authenticated user
    |--------------------------------------------------------------------------
    */

    const user =
      await User.findById(
        req.user.userId
      )
        .select(
          "_id role isActive isSuspended registrationStatus paymentStatus subscriptionStatus"
        )
        .lean();

    if (!user) {
      return res.status(404).json({
        success: false,
        message:
          "User account not found",
      });
    }

    if (
      user.role !== "user"
    ) {
      return res.status(403).json({
        success: false,
        message:
          "Company setup is available only for business users",
      });
    }

    if (
      user.isSuspended
    ) {
      return res.status(403).json({
        success: false,
        message:
          "Your account is suspended",
      });
    }

    /*
    |--------------------------------------------------------------------------
    | 2. Payment / registration / subscription verification
    |--------------------------------------------------------------------------
    */

    const isPaymentVerified =
      user.paymentStatus ===
      "verified";

    const isRegistrationActive =
      user.registrationStatus ===
      "active";

    const isSubscriptionActive =
      user.subscriptionStatus ===
      "active";

    const isAccountActive =
      user.isActive === true;

    if (
      !isPaymentVerified ||
      !isRegistrationActive ||
      !isSubscriptionActive ||
      !isAccountActive
    ) {
      return res.status(403).json({
        success: false,
        message:
          "Company setup is available only after payment approval and account activation",

        status: {
          isActive:
            user.isActive,

          paymentStatus:
            user.paymentStatus,

          registrationStatus:
            user.registrationStatus,

          subscriptionStatus:
            user.subscriptionStatus,
        },
      });
    }

    /*
    |--------------------------------------------------------------------------
    | 3. Validate request structure
    |--------------------------------------------------------------------------
    */

    const {
      company: companyData,
      branch: branchData,
    } = req.body || {};

    if (
      !companyData ||
      typeof companyData !==
        "object"
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Company details are required",
      });
    }

    if (
      !branchData ||
      typeof branchData !==
        "object"
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Branch details are required",
      });
    }

    /*
    |--------------------------------------------------------------------------
    | 4. Validate Company
    |--------------------------------------------------------------------------
    */

    const validatedCompany =
      companyCreateSchema.parse(
        companyData
      );

    /*
    |--------------------------------------------------------------------------
    | 5. Check existing company
    |--------------------------------------------------------------------------
    |
    | This makes the setup API idempotent.
    |
    | If frontend retries the same request,
    | duplicate company will not be created.
    |
    |--------------------------------------------------------------------------
    */

    let company =
      await Company.findOne({
        owner:
          req.user.userId,

        companyName:
          validatedCompany.companyName,
      });

    if (!company) {
      company =
        await Company.create({
          ...validatedCompany,

          owner:
            req.user.userId,
        });

      createdCompany =
        company;
    }

    /*
    |--------------------------------------------------------------------------
    | 6. Validate Branch
    |--------------------------------------------------------------------------
    */

    const validatedBranch =
      branchCreateSchema.parse({
        ...branchData,

        companyId:
          company._id.toString(),

        isMainBranch:
          true,
      });

    /*
    |--------------------------------------------------------------------------
    | 7. Find / Create Main Branch
    |--------------------------------------------------------------------------
    */

    let branch =
      await Branch.findOne({
        company:
          company._id,

        code:
          validatedBranch.code.toUpperCase(),
      });

    if (!branch) {
      /*
      |----------------------------------------------------------------------
      | Make sure this becomes the main branch
      |----------------------------------------------------------------------
      */

      await Branch.updateMany(
        {
          company:
            company._id,
        },
        {
          $set: {
            isMainBranch:
              false,
          },
        }
      );

      branch =
        await Branch.create({
          company:
            company._id,

          name:
            validatedBranch.name,

          code:
            validatedBranch.code.toUpperCase(),

          email:
            validatedBranch.email ||
            "",

          phone:
            validatedBranch.phone ||
            "",

          address:
            validatedBranch.address ||
            "",

          city:
            validatedBranch.city ||
            "",

          state:
            validatedBranch.state ||
            "",

          pincode:
            validatedBranch.pincode ||
            "",

          isMainBranch:
            true,

          isActive:
            true,
        });

      createdBranch =
        branch;
    }

    /*
    |--------------------------------------------------------------------------
    | 8. Current Financial Year
    |--------------------------------------------------------------------------
    */

    const {
      name:
        financialYearName,

      startDate,

      endDate,
    } =
      getCurrentFinancialYear();

    /*
    |--------------------------------------------------------------------------
    | 9. Find / Create Current Financial Year
    |--------------------------------------------------------------------------
    */

    let financialYear =
      await FinancialYear.findOne({
        company:
          company._id,

        name:
          financialYearName,
      });

    if (!financialYear) {
      /*
      |----------------------------------------------------------------------
      | Only one current FY for this company
      |----------------------------------------------------------------------
      */

      await FinancialYear.updateMany(
        {
          company:
            company._id,
        },
        {
          $set: {
            isCurrent:
              false,
          },
        }
      );

      financialYear =
        await FinancialYear.create({
          company:
            company._id,

          name:
            financialYearName,

          startDate,

          endDate,

          isCurrent:
            true,

          isActive:
            true,
        });

      createdFinancialYear =
        financialYear;
    } else if (
      !financialYear.isCurrent
    ) {
      /*
      |----------------------------------------------------------------------
      | Existing current FY should become current
      |----------------------------------------------------------------------
      */

      await FinancialYear.updateMany(
        {
          company:
            company._id,

          _id: {
            $ne:
              financialYear._id,
          },
        },
        {
          $set: {
            isCurrent:
              false,
          },
        }
      );

      financialYear.isCurrent =
        true;

      await financialYear.save();
    }

    /*
    |--------------------------------------------------------------------------
    | 10. Success Response
    |--------------------------------------------------------------------------
    */

    return res.status(201).json({
      success: true,

      message:
        "Company setup completed successfully",

      data: {
        company,
        branch,
        financialYear,
      },
    });
  } catch (error) {
    /*
    |--------------------------------------------------------------------------
    | Cleanup
    |--------------------------------------------------------------------------
    |
    | If this request created new records and a later operation failed,
    | remove only the records created by THIS request.
    |
    |--------------------------------------------------------------------------
    */

    try {
      if (
        createdFinancialYear
      ) {
        await FinancialYear.findByIdAndDelete(
          createdFinancialYear._id
        );
      }

      if (
        createdBranch
      ) {
        await Branch.findByIdAndDelete(
          createdBranch._id
        );
      }

      if (
        createdCompany
      ) {
        await Company.findByIdAndDelete(
          createdCompany._id
        );
      }
    } catch (
      cleanupError
    ) {
      console.error(
        "Company setup cleanup error:",
        cleanupError
      );
    }

    /*
    |--------------------------------------------------------------------------
    | Duplicate key
    |--------------------------------------------------------------------------
    */

    if (
      error.code ===
      11000
    ) {
      return res.status(409).json({
        success: false,
        message:
          "Company or branch already exists",
      });
    }

    next(error);
  }
};

/*
|--------------------------------------------------------------------------
| Get All Companies
|--------------------------------------------------------------------------
*/

const getCompanies = async (
  req,
  res,
  next
) => {
  try {
    const filter =
      req.user.role === "admin"
        ? {}
        : { owner: req.user.userId };

    let companies =
      await Company.find(filter)
        .sort({
          createdAt: -1,
        })
        .lean();

    // If a normal user has 0 companies, check for orphaned companies (owner null or deleted)
    if (companies.length === 0 && req.user.role !== "admin") {
      const allUsers = await User.find({}, "_id").lean();
      const userIds = allUsers.map((u) => u._id.toString());
      const orphaned = await Company.find({
        $or: [
          { owner: null },
          { owner: { $exists: false } },
          { owner: { $nin: userIds } }
        ]
      }).lean();

      if (orphaned.length > 0) {
        await Company.updateMany(
          { _id: { $in: orphaned.map((c) => c._id) } },
          { $set: { owner: req.user.userId } }
        );
        companies = await Company.find({ owner: req.user.userId }).sort({ createdAt: -1 }).lean();
      }
    }

    // Attach branches to each company
    for (const comp of companies) {
      let branches = await Branch.find({ company: comp._id, isActive: true }).lean();
      if (!branches || branches.length === 0) {
        const newBranch = await Branch.create({
          company: comp._id,
          name: `${comp.companyName} Main Branch`,
          code: "MAIN",
          email: comp.email || "",
          phone: comp.phone || "",
          address: comp.address || "",
          city: comp.city || "",
          state: comp.state || "Gujarat",
          pincode: comp.pincode || "",
          isMainBranch: true,
          isActive: true,
        });
        branches = [newBranch.toObject ? newBranch.toObject() : newBranch];
      }
      comp.branches = branches;

      // Ensure financial year exists
      const fyCount = await FinancialYear.countDocuments({ company: comp._id });
      if (fyCount === 0) {
        const { name: fyName, startDate, endDate } = getCurrentFinancialYear();
        await FinancialYear.create({
          company: comp._id,
          name: fyName,
          startDate,
          endDate,
          isCurrent: true,
          isActive: true,
        });
      }
    }

    return res.status(200).json({
      success: true,
      count:
        companies.length,
      companies,
    });
  } catch (error) {
    next(error);
  }
};

/*
|--------------------------------------------------------------------------
| Get Single Company
|--------------------------------------------------------------------------
*/

const getCompanyById = async (
  req,
  res,
  next
) => {
  try {
    const {
      id,
    } = req.params;

    if (
      !mongoose.Types.ObjectId.isValid(
        id
      )
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Invalid company ID",
      });
    }

    const company =
      await Company.findOne({
        _id: id,
        owner:
          req.user.userId,
      });

    if (!company) {
      return res.status(404).json({
        success: false,
        message:
          "Company not found",
      });
    }

    return res.status(200).json({
      success: true,
      company,
    });
  } catch (error) {
    next(error);
  }
};

/*
|--------------------------------------------------------------------------
| Update Company
|--------------------------------------------------------------------------
*/

const updateCompany = async (
  req,
  res,
  next
) => {
  try {
    const {
      id,
    } = req.params;

    if (
      !mongoose.Types.ObjectId.isValid(
        id
      )
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Invalid company ID",
      });
    }

    const validatedData =
      companyUpdateSchema.parse(
        req.body
      );

    const company =
      await Company.findOneAndUpdate(
        {
          _id: id,

          owner:
            req.user.userId,
        },

        validatedData,

        {
          new: true,

          runValidators:
            true,
        }
      );

    if (!company) {
      return res.status(404).json({
        success: false,
        message:
          "Company not found",
      });
    }

    return res.status(200).json({
      success: true,

      message:
        "Company updated successfully",

      company,
    });
  } catch (error) {
    next(error);
  }
};

/*
|--------------------------------------------------------------------------
| Delete Company
|--------------------------------------------------------------------------
*/

const deleteCompany = async (
  req,
  res,
  next
) => {
  try {
    const {
      id,
    } = req.params;

    if (
      !mongoose.Types.ObjectId.isValid(
        id
      )
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Invalid company ID",
      });
    }

    const company =
      await Company.findOneAndDelete({
        _id: id,

        owner:
          req.user.userId,
      });

    if (!company) {
      return res.status(404).json({
        success: false,
        message:
          "Company not found",
      });
    }

    return res.status(200).json({
      success: true,

      message:
        "Company deleted successfully",
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  setupCompany,
  createCompany,
  getCompanies,
  getCompanyById,
  updateCompany,
  deleteCompany,
};