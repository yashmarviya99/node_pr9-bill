const mongoose = require("mongoose");

const employeeSchema = new mongoose.Schema(
  {
    company: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Company",
      required: true,
      index: true,
    },
    branch: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Branch",
      default: null,
      index: true,
    },
    employeeCode: {
      type: String,
      trim: true,
      uppercase: true,
      default: "",
    },
    name: {
      type: String,
      required: [true, "Employee name is required"],
      trim: true,
    },
    contactMobile: {
      type: String,
      required: [true, "Contact mobile is required"],
      trim: true,
    },
    contactEmail: {
      type: String,
      trim: true,
      lowercase: true,
      default: "",
    },
    address: {
      type: String,
      trim: true,
      default: "",
    },
    designation: {
      type: String,
      trim: true,
      default: "Staff",
    },
    salary: {
      type: Number,
      default: 0,
      min: 0,
    },
    jobStatus: {
      type: String,
      enum: ["active", "inactive"],
      default: "active",
      index: true,
    },
    joiningDate: {
      type: Date,
      default: Date.now,
    },
    leavingDate: {
      type: Date,
      default: null,
    },
    leavingReason: {
      type: String,
      trim: true,
      default: "",
    },
    account: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Account",
      default: null,
    },
    notes: {
      type: String,
      trim: true,
      default: "",
    },
  },
  {
    timestamps: true,
  }
);

employeeSchema.index({ company: 1, employeeCode: 1 });
employeeSchema.index({ company: 1, name: 1 });

const Employee = mongoose.model("Employee", employeeSchema);

module.exports = Employee;
