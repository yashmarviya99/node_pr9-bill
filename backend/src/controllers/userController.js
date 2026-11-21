const mongoose = require("mongoose");

const User = require("../models/User");

/*
|--------------------------------------------------------------------------
| GET ALL USERS / SEARCH / FILTER / PAGINATION
|--------------------------------------------------------------------------
|
| GET /api/admin/users
|
| Query Parameters:
|
| search
| isActive
| isSuspended
| paymentStatus
| registrationStatus
| subscriptionStatus
| page
| limit
| sortBy
| sortOrder
|
*/

const getAllUsers = async (
  req,
  res,
  next
) => {
  try {
    const {
      search = "",
      isActive,
      isSuspended,
      paymentStatus,
      registrationStatus,
      subscriptionStatus,
      page = 1,
      limit = 50,
      sortBy = "createdAt",
      sortOrder = "desc",
    } = req.query;

    /*
    |--------------------------------------------------------------------------
    | PAGINATION VALIDATION
    |--------------------------------------------------------------------------
    */

    const pageNumber = Math.max(
      Number(page) || 1,
      1
    );

    const limitNumber = Math.min(
      Math.max(
        Number(limit) || 50,
        1
      ),
      100
    );

    const skip =
      (pageNumber - 1) *
      limitNumber;

    /*
    |--------------------------------------------------------------------------
    | BASE FILTER
    |--------------------------------------------------------------------------
    |
    | Admin users should never appear in normal user management.
    |
    */

    const filter = {
      role: "user",
    };

    /*
    |--------------------------------------------------------------------------
    | SEARCH
    |--------------------------------------------------------------------------
    */

    const trimmedSearch =
      String(search).trim();

    if (trimmedSearch) {
      const escapedSearch =
        trimmedSearch.replace(
          /[.*+?^${}()|[\]\\]/g,
          "\\$&"
        );

      const searchRegex =
        new RegExp(
          escapedSearch,
          "i"
        );

      filter.$or = [
        {
          name: searchRegex,
        },
        {
          ownerName: searchRegex,
        },
        {
          username: searchRegex,
        },
        {
          email: searchRegex,
        },
        {
          mobileNumber: searchRegex,
        },
      ];
    }

    /*
    |--------------------------------------------------------------------------
    | ACTIVE FILTER
    |--------------------------------------------------------------------------
    */

    if (
      isActive !== undefined &&
      isActive !== ""
    ) {
      if (
        isActive !== "true" &&
        isActive !== "false"
      ) {
        return res.status(400).json({
          success: false,
          message:
            "isActive must be true or false",
        });
      }

      filter.isActive =
        isActive === "true";
    }

    /*
    |--------------------------------------------------------------------------
    | SUSPENDED FILTER
    |--------------------------------------------------------------------------
    */

    if (
      isSuspended !== undefined &&
      isSuspended !== ""
    ) {
      if (
        isSuspended !== "true" &&
        isSuspended !== "false"
      ) {
        return res.status(400).json({
          success: false,
          message:
            "isSuspended must be true or false",
        });
      }

      filter.isSuspended =
        isSuspended === "true";
    }

    /*
    |--------------------------------------------------------------------------
    | PAYMENT STATUS FILTER
    |--------------------------------------------------------------------------
    */

    if (
      paymentStatus !== undefined &&
      paymentStatus !== ""
    ) {
      const allowedPaymentStatuses = [
        "pending",
        "submitted",
        "verified",
        "failed",
        "refunded",
      ];

      if (
        !allowedPaymentStatuses.includes(
          paymentStatus
        )
      ) {
        return res.status(400).json({
          success: false,
          message:
            "Invalid paymentStatus",
        });
      }

      filter.paymentStatus =
        paymentStatus;
    }

    /*
    |--------------------------------------------------------------------------
    | REGISTRATION STATUS FILTER
    |--------------------------------------------------------------------------
    */

    if (
      registrationStatus !==
        undefined &&
      registrationStatus !== ""
    ) {
      const allowedRegistrationStatuses = [
        "pending_payment",
        "payment_pending_verification",
        "pending_activation",
        "active",
        "rejected",
      ];

      if (
        !allowedRegistrationStatuses.includes(
          registrationStatus
        )
      ) {
        return res.status(400).json({
          success: false,
          message:
            "Invalid registrationStatus",
        });
      }

      filter.registrationStatus =
        registrationStatus;
    }

    /*
    |--------------------------------------------------------------------------
    | SUBSCRIPTION STATUS FILTER
    |--------------------------------------------------------------------------
    */

    if (
      subscriptionStatus !==
        undefined &&
      subscriptionStatus !== ""
    ) {
      const allowedSubscriptionStatuses = [
        "pending",
        "active",
        "expired",
        "cancelled",
      ];

      if (
        !allowedSubscriptionStatuses.includes(
          subscriptionStatus
        )
      ) {
        return res.status(400).json({
          success: false,
          message:
            "Invalid subscriptionStatus",
        });
      }

      filter.subscriptionStatus =
        subscriptionStatus;
    }

    /*
    |--------------------------------------------------------------------------
    | SORTING
    |--------------------------------------------------------------------------
    */

    const allowedSortFields = [
      "name",
      "username",
      "email",
      "createdAt",
      "updatedAt",
      "isActive",
      "isSuspended",
      "paymentStatus",
      "registrationStatus",
      "subscriptionStatus",
    ];

    const selectedSortField =
      allowedSortFields.includes(
        sortBy
      )
        ? sortBy
        : "createdAt";

    const selectedSortOrder =
      String(sortOrder)
        .toLowerCase() === "asc"
        ? 1
        : -1;

    const sortObject = {
      [selectedSortField]:
        selectedSortOrder,
    };

    /*
    |--------------------------------------------------------------------------
    | FETCH USERS
    |--------------------------------------------------------------------------
    */

    const [users, total] =
      await Promise.all([
        User.find(filter)
          .select(
            [
              "_id",
              "name",
              "ownerName",
              "username",
              "email",
              "mobileNumber",
              "secondMobileNumber",
              "role",
              "isActive",
              "isSuspended",
              "registrationStatus",
              "paymentStatus",
              "subscriptionStatus",
              "registrationPaymentMethod",
              "subscriptionStartDate",
              "subscriptionEndDate",
              "createdAt",
              "updatedAt",
            ].join(" ")
          )
          .sort(sortObject)
          .skip(skip)
          .limit(limitNumber)
          .lean(),

        User.countDocuments(filter),
      ]);

    /*
    |--------------------------------------------------------------------------
    | PAGINATION
    |--------------------------------------------------------------------------
    */

    const totalPages =
      Math.ceil(
        total / limitNumber
      );

    /*
    |--------------------------------------------------------------------------
    | RESPONSE
    |--------------------------------------------------------------------------
    */

    return res.status(200).json({
      success: true,
      message:
        "Users fetched successfully",

      filters: {
        search:
          trimmedSearch,
        isActive:
          isActive !== undefined &&
          isActive !== ""
            ? isActive === "true"
            : null,
        isSuspended:
          isSuspended !== undefined &&
          isSuspended !== ""
            ? isSuspended === "true"
            : null,
        paymentStatus:
          paymentStatus || null,
        registrationStatus:
          registrationStatus || null,
        subscriptionStatus:
          subscriptionStatus || null,
      },

      sorting: {
        sortBy:
          selectedSortField,
        sortOrder:
          selectedSortOrder === 1
            ? "asc"
            : "desc",
      },

      pagination: {
        page: pageNumber,
        limit: limitNumber,
        total,
        totalPages,
        hasPreviousPage:
          pageNumber > 1,
        hasNextPage:
          pageNumber < totalPages,
      },

      count: users.length,

      users,
    });
  } catch (error) {
    console.error(
      "Get All Users Error:",
      error
    );

    next(error);
  }
};

/*
|--------------------------------------------------------------------------
| GET SINGLE USER
|--------------------------------------------------------------------------
*/

const getSingleUser = async (
  req,
  res,
  next
) => {
  try {
    const { userId } =
      req.params;

    if (!userId) {
      return res.status(400).json({
        success: false,
        message:
          "User ID is required",
      });
    }

    if (
      !mongoose.Types.ObjectId.isValid(
        userId
      )
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Invalid user ID",
      });
    }

    const user =
      await User.findOne({
        _id: userId,
        role: "user",
      })
        .select(
          [
            "_id",
            "name",
            "ownerName",
            "username",
            "email",
            "mobileNumber",
            "secondMobileNumber",
            "role",
            "isActive",
            "isSuspended",
            "registrationStatus",
            "paymentStatus",
            "subscriptionStatus",
            "registrationPaymentMethod",
            "subscriptionStartDate",
            "subscriptionEndDate",
            "createdAt",
            "updatedAt",
          ].join(" ")
        )
        .lean();

    if (!user) {
      return res.status(404).json({
        success: false,
        message:
          "User not found",
      });
    }

    return res.status(200).json({
      success: true,
      message:
        "User details fetched successfully",
      data: {
        user,
      },
    });
  } catch (error) {
    console.error(
      "Get Single User Error:",
      error
    );

    if (
      error.name ===
      "CastError"
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Invalid user ID",
      });
    }

    next(error);
  }
};

/*
|--------------------------------------------------------------------------
| ACTIVATE USER
|--------------------------------------------------------------------------
*/

const activateUser = async (
  req,
  res,
  next
) => {
  try {
    const { userId } =
      req.params;

    if (!userId) {
      return res.status(400).json({
        success: false,
        message:
          "User ID is required",
      });
    }

    if (
      !mongoose.Types.ObjectId.isValid(
        userId
      )
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Invalid user ID",
      });
    }

    const user =
      await User.findOne({
        _id: userId,
        role: "user",
      }).lean();

    if (!user) {
      return res.status(404).json({
        success: false,
        message:
          "User not found",
      });
    }

    await User.updateOne(
      {
        _id: userId,
        role: "user",
      },
      {
        $set: {
          isActive: true,
          isSuspended: false,
          registrationStatus:
            "active",
          subscriptionStatus:
            "active",
        },
      }
    );

    return res.status(200).json({
      success: true,
      message:
        "User activated successfully",
      data: {
        user: {
          _id: user._id,
          name: user.name,
          ownerName:
            user.ownerName,
          username:
            user.username,
          email: user.email,
          isActive: true,
          isSuspended: false,
          registrationStatus:
            "active",
          paymentStatus:
            user.paymentStatus,
          subscriptionStatus:
            "active",
        },
      },
    });
  } catch (error) {
    console.error(
      "Activate User Error:",
      error
    );

    next(error);
  }
};

/*
|--------------------------------------------------------------------------
| DEACTIVATE USER
|--------------------------------------------------------------------------
*/

const deactivateUser = async (
  req,
  res,
  next
) => {
  try {
    const { userId } =
      req.params;

    if (!userId) {
      return res.status(400).json({
        success: false,
        message:
          "User ID is required",
      });
    }

    if (
      !mongoose.Types.ObjectId.isValid(
        userId
      )
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Invalid user ID",
      });
    }

    const user =
      await User.findOne({
        _id: userId,
        role: "user",
      }).lean();

    if (!user) {
      return res.status(404).json({
        success: false,
        message:
          "User not found",
      });
    }

    await User.updateOne(
      {
        _id: userId,
        role: "user",
      },
      {
        $set: {
          isActive: false,
        },
      }
    );

    return res.status(200).json({
      success: true,
      message:
        "User deactivated successfully",
      data: {
        user: {
          _id: user._id,
          name: user.name,
          ownerName:
            user.ownerName,
          username:
            user.username,
          email: user.email,
          isActive: false,
          isSuspended:
            user.isSuspended,
          registrationStatus:
            user.registrationStatus,
          paymentStatus:
            user.paymentStatus,
          subscriptionStatus:
            user.subscriptionStatus,
        },
      },
    });
  } catch (error) {
    console.error(
      "Deactivate User Error:",
      error
    );

    next(error);
  }
};

/*
|--------------------------------------------------------------------------
| SUSPEND USER
|--------------------------------------------------------------------------
*/

const suspendUser = async (
  req,
  res,
  next
) => {
  try {
    const { userId } =
      req.params;

    if (!userId) {
      return res.status(400).json({
        success: false,
        message:
          "User ID is required",
      });
    }

    if (
      !mongoose.Types.ObjectId.isValid(
        userId
      )
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Invalid user ID",
      });
    }

    const user =
      await User.findOne({
        _id: userId,
        role: "user",
      }).lean();

    if (!user) {
      return res.status(404).json({
        success: false,
        message:
          "User not found",
      });
    }

    if (user.isSuspended) {
      return res.status(400).json({
        success: false,
        message:
          "User is already suspended",
      });
    }

    await User.updateOne(
      {
        _id: userId,
        role: "user",
      },
      {
        $set: {
          isActive: false,
          isSuspended: true,
        },
      }
    );

    return res.status(200).json({
      success: true,
      message:
        "User suspended successfully",
      data: {
        user: {
          _id: user._id,
          name: user.name,
          ownerName:
            user.ownerName,
          username:
            user.username,
          email: user.email,
          isActive: false,
          isSuspended: true,
          registrationStatus:
            user.registrationStatus,
          paymentStatus:
            user.paymentStatus,
          subscriptionStatus:
            user.subscriptionStatus,
        },
      },
    });
  } catch (error) {
    console.error(
      "Suspend User Error:",
      error
    );

    next(error);
  }
};

/*
|--------------------------------------------------------------------------
| UNSUSPEND USER
|--------------------------------------------------------------------------
*/

const unsuspendUser = async (
  req,
  res,
  next
) => {
  try {
    const { userId } =
      req.params;

    if (!userId) {
      return res.status(400).json({
        success: false,
        message:
          "User ID is required",
      });
    }

    if (
      !mongoose.Types.ObjectId.isValid(
        userId
      )
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Invalid user ID",
      });
    }

    const user =
      await User.findOne({
        _id: userId,
        role: "user",
      }).lean();

    if (!user) {
      return res.status(404).json({
        success: false,
        message:
          "User not found",
      });
    }

    if (!user.isSuspended) {
      return res.status(400).json({
        success: false,
        message:
          "User is not suspended",
      });
    }

    /*
      Unsuspend should not bypass
      registration/payment/subscription rules.

      Only a fully verified/active account
      becomes active again.
    */

    const shouldActivate =
      user.paymentStatus ===
        "verified" &&
      user.registrationStatus ===
        "active" &&
      user.subscriptionStatus ===
        "active";

    await User.updateOne(
      {
        _id: userId,
        role: "user",
      },
      {
        $set: {
          isSuspended: false,
          isActive:
            shouldActivate,
        },
      }
    );

    return res.status(200).json({
      success: true,
      message:
        "User unsuspended successfully",
      data: {
        user: {
          _id: user._id,
          name: user.name,
          ownerName:
            user.ownerName,
          username:
            user.username,
          email: user.email,
          isActive:
            shouldActivate,
          isSuspended: false,
          registrationStatus:
            user.registrationStatus,
          paymentStatus:
            user.paymentStatus,
          subscriptionStatus:
            user.subscriptionStatus,
        },
      },
    });
  } catch (error) {
    console.error(
      "Unsuspend User Error:",
      error
    );

    next(error);
  }
};

/*
|--------------------------------------------------------------------------
| EXPORTS
|--------------------------------------------------------------------------
*/

module.exports = {
  getAllUsers,
  getSingleUser,
  activateUser,
  deactivateUser,
  suspendUser,
  unsuspendUser,
};