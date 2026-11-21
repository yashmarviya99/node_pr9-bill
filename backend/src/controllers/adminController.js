const User = require("../models/User");

const getAllUsers = async (
    req,
    res,
    next
) => {
    try {
        const {
            page = 1,
            limit = 50,
            search = "",
            isActive,
            registrationStatus,
            paymentStatus,
            subscriptionStatus,
        } = req.query;

        const currentPage =
            Math.max(Number(page), 1);

        const currentLimit = Math.min(
            Math.max(Number(limit), 1),
            100
        );

        const skip =
            (currentPage - 1) * currentLimit;

        const query = {
            role: "user",
        };

        if (search.trim()) {
            const searchRegex =
                new RegExp(
                    search.trim(),
                    "i"
                );

            query.$or = [
                {name: searchRegex,},
                {ownerName: searchRegex,},
                {username: searchRegex,},
                {email: searchRegex,},
                {mobileNumber: searchRegex,},
            ];
        }

        if (
            isActive === "true" ||
            isActive === "false"
        ) {
            query.isActive =
                isActive === "true";
        }

        if (registrationStatus) {
            query.registrationStatus =
                registrationStatus;
        }

        if (paymentStatus) {
            query.paymentStatus =
                paymentStatus;
        }

        if (subscriptionStatus) {
            query.subscriptionStatus =
                subscriptionStatus;
        }

        const [users, totalUsers, ] = await Promise.all([
            User.find(query)
                .select("-password")
                .sort({
                    createdAt: -1,
                })
                .skip(skip)
                .limit(currentLimit)
                .lean(),

            User.countDocuments(query),
        ]);

        return res.status(200).json({
            success: true,
            message:
                "Users fetched successfully",
            data: {
                users,
                pagination: {
                    currentPage,
                    limit: currentLimit,
                    totalUsers,
                    totalPages: Math.ceil(
                        totalUsers /
                        currentLimit
                    ),
                },
            },
        });
    } catch (error) {
        console.error(
            "Get All Users Error:",
            error
        );

        next(error);
    }
};

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

        if (user.isActive) {
            return res.status(400).json({
                success: false,
                message:
                    "User is already active",
            });
        }

        if (
            user.paymentStatus !==
            "verified"
        ) {
            return res.status(400).json({
                success: false,
                message:
                    "User payment must be verified before activation",
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
        console.error("Activate User Error:", error);
        if (
            error.name === "CastError"
        ) {
            return res.status(400).json({
                success: false,
                message: "Invalid user ID",
            });
        }
        next(error);
    }
};

const deactivateUser = async (req, res, next) => {
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

        if (!user.isActive) {
            return res.status(400).json({
                success: false,
                message:
                    "User is already inactive",
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
                    ownerName: user.ownerName,
                    username: user.username,
                    email: user.email,
                    isActive: false,
                    isSuspended: user.isSuspended,
                    registrationStatus: user.registrationStatus,
                    paymentStatus: user.paymentStatus,
                    subscriptionStatus: user.subscriptionStatus,
                },
            },
        });
    } catch (error) {
        console.error(
            "Deactivate User Error:",
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

const suspendUser = async (req, res, next) => {
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
                    ownerName: user.ownerName,
                    username: user.username,
                    email: user.email,
                    isActive: false,
                    isSuspended: true,
                    registrationStatus: user.registrationStatus,
                    paymentStatus: user.paymentStatus,
                    subscriptionStatus: user.subscriptionStatus,
                },
            },
        });
    } catch (error) {
        console.error(
            "Suspend User Error:",
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

const unsuspendUser = async (req, res, next) => {
    try {
        const { userId } = req.params;

        if (!userId) {
            return res.status(400).json({
                success: false,
                message: "User ID is required",
            });
        }

        const user = await User.findOne({
            _id: userId,
            role: "user",
        }).lean();

        if (!user) {
            return res.status(404).json({
                success: false,
                message: "User not found",
            });
        }

        if (!user.isSuspended) {
            return res.status(400).json({
                success: false,
                message: "User is not suspended",
            });
        }

        /*all already valid.*/
        const shouldActivate =
            user.paymentStatus === "verified" &&
            user.registrationStatus === "active" &&
            user.subscriptionStatus === "active";

        await User.updateOne(
            {
                _id: userId,
                role: "user",
            },
            {
                $set: {
                    isSuspended: false,
                    isActive: shouldActivate,
                },
            }
        );

        return res.status(200).json({
            success: true,
            message: "User unsuspended successfully",
            data: {
                user: {
                    _id: user._id,
                    name: user.name,
                    ownerName: user.ownerName,
                    username: user.username,
                    email: user.email,
                    isActive: shouldActivate,
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

        if (error.name === "CastError") {
            return res.status(400).json({
                success: false,
                message: "Invalid user ID",
            });
        }

        next(error);
    }
};

module.exports = {
    getAllUsers,
    getSingleUser,
    activateUser,
    deactivateUser,
    suspendUser,
    unsuspendUser,
};