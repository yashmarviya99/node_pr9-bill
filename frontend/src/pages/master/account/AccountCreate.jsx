import React, { useState, useEffect } from "react";
import { Link, useNavigate, useLocation, useParams } from "react-router-dom";
import { useSelector } from "react-redux";
import {
  FileText,
  Save,
  CheckCircle,
  Search,
  List,
  AlertCircle,
  Building,
} from "lucide-react";
import api from "../../../services/api";
import { verifyAndParseGSTIN } from "../../../utils/gst";
import toast from "react-hot-toast";

export default function AccountCreate({ defaultAccountType }) {
  const navigate = useNavigate();
  const location = useLocation();
  const { id } = useParams();
  const isEdit = Boolean(id);

  const { activeCompany } = useSelector((state) => state.company);

  // Determine initial account group from route or prop
  let initialType = defaultAccountType || "customer";
  if (location.pathname.includes("/customer")) {
    initialType = "customer";
  } else if (location.pathname.includes("/supplier")) {
    initialType = "supplier";
  }

  const [loading, setLoading] = useState(false);
  const [verifyingGST, setVerifyingGST] = useState(false);

  const [formData, setFormData] = useState({
    gstin: "",
    accountName: "",
    accountGroup: initialType, // 'customer', 'supplier', 'bank', 'cash', 'income', 'expense', 'capital', 'other'
    gstType: "Registered", // 'Registered', 'Unregistered', 'Composition'
    accountSearchCode: "",
    address: "",
    city: "Rajkot",
    state: "Gujarat",
    country: "India",
    pincode: "360004",
    contactPersonName: "",
    contactPersonMobile: "",
    contactPersonEmail: "",
    openingBalance: 0,
    openingBalanceStatus: "debit", // 'debit' or 'credit'
    creditLimit: 0,
    nextInvoicePaymentDay: 30,
    shippingAddress: "",
    enableShippingOnInvoice: "No",
    bankName: "",
    bankAccountNo: "",
    bankAccountType: "Current",
    bankIfscCode: "",
    bankBranchAddress: "",
  });

  useEffect(() => {
    if (isEdit) {
      loadAccountData(id);
    }
  }, [id, isEdit]);

  const loadAccountData = async (accId) => {
    try {
      setLoading(true);
      const res = await api.get(`/accounts/${accId}`);
      if (res.data?.success && res.data.account) {
        const acc = res.data.account;
        setFormData({
          gstin: acc.gstNumber || "",
          accountName: acc.name || "",
          accountGroup: acc.accountType || "customer",
          gstType: acc.gstType || "Registered",
          accountSearchCode: acc.accountCode || "",
          address: acc.address || "",
          city: acc.city || "Rajkot",
          state: acc.state || "Gujarat",
          country: acc.country || "India",
          pincode: acc.pincode || "360004",
          contactPersonName: acc.contactPerson || "",
          contactPersonMobile: acc.phone || "",
          contactPersonEmail: acc.email || "",
          openingBalance: acc.openingBalance || 0,
          openingBalanceStatus: acc.openingBalanceType || "debit",
          creditLimit: acc.creditLimit || 0,
          nextInvoicePaymentDay: acc.paymentDays || 30,
          shippingAddress: acc.shippingAddress || "",
          enableShippingOnInvoice: acc.enableShipping ? "Yes" : "No",
          bankName: acc.bankName || "",
          bankAccountNo: acc.accountNumber || "",
          bankAccountType: acc.bankAccountType || "Current",
          bankIfscCode: acc.ifscCode || "",
          bankBranchAddress: acc.bankBranchAddress || "",
        });
      }
    } catch (err) {
      toast.error("Failed to load account details");
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleVerifyGSTIN = () => {
    if (!formData.gstin.trim()) {
      toast.error("Please enter a GSTIN first");
      return;
    }
    setVerifyingGST(true);
    setTimeout(() => {
      const result = verifyAndParseGSTIN(formData.gstin);
      if (result.isValid) {
        setFormData((prev) => ({
          ...prev,
          gstin: result.gstin,
          accountName: prev.accountName || result.tradeName,
          state: result.stateName,
          city: prev.city || result.city,
          pincode: prev.pincode || result.pincode,
          address: prev.address || result.address,
          country: "India",
          gstType: "Registered",
        }));
        toast.success(`GSTIN verified: ${result.stateName}`);
      } else {
        toast.error(result.message);
      }
      setVerifyingGST(false);
    }, 400);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!formData.accountName.trim()) {
      toast.error("Account Name is required");
      return;
    }
    if (!formData.city.trim() || !formData.state.trim()) {
      toast.error("City and State are required");
      return;
    }

    try {
      setLoading(true);

      const payload = {
        name: formData.accountName.trim(),
        accountType: formData.accountGroup,
        accountCode: formData.accountSearchCode.trim(),
        contactPerson: formData.contactPersonName.trim(),
        phone: formData.contactPersonMobile.trim(),
        email: formData.contactPersonEmail.trim().toLowerCase(),
        address: formData.address.trim(),
        city: formData.city.trim(),
        state: formData.state.trim(),
        country: formData.country.trim(),
        pincode: formData.pincode.trim(),
        openingBalance: Number(formData.openingBalance || 0),
        openingBalanceType: formData.openingBalanceStatus,
        bankName: formData.bankName.trim(),
        accountNumber: formData.bankAccountNo.trim(),
        ifscCode: formData.bankIfscCode.trim(),
        gstNumber: formData.gstin.trim().toUpperCase(),
        gstType: formData.gstType,
        description: `Customer/Supplier account for ${formData.accountName}`,
      };

      if (isEdit) {
        await api.put(`/accounts/${id}`, payload);
        toast.success("Account updated successfully");
      } else {
        await api.post("/accounts", payload);
        toast.success("Customer/Supplier account saved successfully.");
      }

      // Redirect to appropriate list
      if (formData.accountGroup === "customer") {
        navigate("/master/customer/list");
      } else if (formData.accountGroup === "supplier") {
        navigate("/master/supplier/list");
      } else {
        navigate("/master/account/list");
      }
    } catch (err) {
      toast.error(err.message || "Failed to save account");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-4 max-w-6xl mx-auto animate-in fade-in">
      {/* Top Title Bar with 3 list shortcut buttons */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-white px-5 py-3 rounded-lg shadow-sm border border-gray-200">
        <div className="flex items-center space-x-2 text-gray-800">
          <div className="p-2 bg-green-50 text-[#37AD47] rounded-lg">
            <FileText className="h-5 w-5" />
          </div>
          <div>
            <h2 className="font-extrabold text-sm sm:text-base tracking-wide uppercase">
              {isEdit ? "EDIT ACCOUNT" : "ACCOUNT ENTRY FORM"}
            </h2>
            <p className="text-[11px] text-gray-400">
              Create Customer or Supplier Master Record
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-2">
          <Link
            to="/master/customer/list"
            className="rounded bg-[#FBBC4B] hover:bg-[#e0a63e] text-gray-900 px-3.5 py-1.5 text-xs font-bold shadow-sm transition inline-flex items-center space-x-1"
          >
            <List className="h-3.5 w-3.5" />
            <span>Customer List</span>
          </Link>
          <Link
            to="/master/supplier/list"
            className="rounded bg-[#FBBC4B] hover:bg-[#e0a63e] text-gray-900 px-3.5 py-1.5 text-xs font-bold shadow-sm transition inline-flex items-center space-x-1"
          >
            <List className="h-3.5 w-3.5" />
            <span>Supplier List</span>
          </Link>
          <Link
            to="/master/account/list"
            className="rounded bg-[#FBBC4B] hover:bg-[#e0a63e] text-gray-900 px-3.5 py-1.5 text-xs font-bold shadow-sm transition inline-flex items-center space-x-1"
          >
            <List className="h-3.5 w-3.5" />
            <span>Account List</span>
          </Link>
        </div>
      </div>

      {/* Main Entry Form */}
      <form onSubmit={handleSubmit} className="bg-white rounded-xl shadow-sm border border-gray-200 p-5 space-y-6 text-xs text-gray-700">
        {/* Section 1: GST & Account Details */}
        <div>
          <h3 className="font-bold text-xs uppercase text-gray-400 tracking-wider border-b pb-1.5 mb-3 flex items-center space-x-1.5">
            <span className="h-2 w-2 rounded-full bg-[#37AD47]"></span>
            <span>GST & Account Details</span>
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <div>
              <label className="block font-semibold mb-1">
                GSTIN{" "}
                <button
                  type="button"
                  onClick={handleVerifyGSTIN}
                  disabled={verifyingGST}
                  className="ml-2 text-xs text-blue-600 hover:underline font-bold"
                >
                  {verifyingGST ? "Verifying..." : "Verify GSTIN"}
                </button>
              </label>
              <input
                type="text"
                name="gstin"
                value={formData.gstin}
                onChange={handleChange}
                placeholder="e.g. 24AAAPL1234F1Z5"
                className="w-full rounded border border-gray-300 px-3 py-2 outline-none focus:border-green-500 uppercase"
              />
            </div>

            <div>
              <label className="block font-semibold mb-1">Account Name *</label>
              <input
                type="text"
                name="accountName"
                required
                value={formData.accountName}
                onChange={handleChange}
                placeholder="e.g. BHAVESHBHAI KAPURIYA"
                className="w-full rounded border border-gray-300 px-3 py-2 outline-none focus:border-green-500"
              />
            </div>

            <div>
              <label className="block font-semibold mb-1">Account Group *</label>
              <select
                name="accountGroup"
                value={formData.accountGroup}
                onChange={handleChange}
                className="w-full rounded border border-gray-300 px-3 py-2 outline-none focus:border-green-500 bg-white"
              >
                <option value="customer">Sundry Debtors (Customer)</option>
                <option value="supplier">Sundry Creditors (Supplier)</option>
                <option value="bank">Bank Account</option>
                <option value="cash">Cash Account</option>
                <option value="income">Direct / Indirect Income</option>
                <option value="expense">Direct / Indirect Expense</option>
                <option value="capital">Capital Account</option>
                <option value="other">Other Account</option>
              </select>
            </div>

            <div>
              <label className="block font-semibold mb-1">GST Type *</label>
              <select
                name="gstType"
                value={formData.gstType}
                onChange={handleChange}
                className="w-full rounded border border-gray-300 px-3 py-2 outline-none focus:border-green-500 bg-white"
              >
                <option value="Registered">Registered</option>
                <option value="Unregistered">Unregistered</option>
                <option value="Composition">Composition</option>
              </select>
            </div>

            <div>
              <label className="block font-semibold mb-1">Account Search Code (Optional)</label>
              <input
                type="text"
                name="accountSearchCode"
                value={formData.accountSearchCode}
                onChange={handleChange}
                placeholder="e.g. CUST-001"
                className="w-full rounded border border-gray-300 px-3 py-2 outline-none focus:border-green-500 uppercase"
              />
            </div>
          </div>
        </div>

        {/* Section 2: Address Details */}
        <div>
          <h3 className="font-bold text-xs uppercase text-gray-400 tracking-wider border-b pb-1.5 mb-3 flex items-center space-x-1.5">
            <span className="h-2 w-2 rounded-full bg-[#FBBC4B]"></span>
            <span>Address Details</span>
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <div className="sm:col-span-2">
              <label className="block font-semibold mb-1">Address</label>
              <input
                type="text"
                name="address"
                value={formData.address}
                onChange={handleChange}
                placeholder="Street address, building, premises"
                className="w-full rounded border border-gray-300 px-3 py-2 outline-none focus:border-green-500"
              />
            </div>

            <div>
              <label className="block font-semibold mb-1">City *</label>
              <input
                type="text"
                name="city"
                required
                value={formData.city}
                onChange={handleChange}
                placeholder="e.g. Rajkot"
                className="w-full rounded border border-gray-300 px-3 py-2 outline-none focus:border-green-500"
              />
            </div>

            <div>
              <label className="block font-semibold mb-1">State *</label>
              <input
                type="text"
                name="state"
                required
                value={formData.state}
                onChange={handleChange}
                placeholder="e.g. Gujarat"
                className="w-full rounded border border-gray-300 px-3 py-2 outline-none focus:border-green-500"
              />
            </div>

            <div>
              <label className="block font-semibold mb-1">Country *</label>
              <input
                type="text"
                name="country"
                required
                value={formData.country}
                onChange={handleChange}
                className="w-full rounded border border-gray-300 px-3 py-2 outline-none focus:border-green-500"
              />
            </div>

            <div>
              <label className="block font-semibold mb-1">Pin-code</label>
              <input
                type="text"
                name="pincode"
                value={formData.pincode}
                onChange={handleChange}
                placeholder="e.g. 360004"
                className="w-full rounded border border-gray-300 px-3 py-2 outline-none focus:border-green-500"
              />
            </div>
          </div>
        </div>

        {/* Section 3: Contact Details */}
        <div>
          <h3 className="font-bold text-xs uppercase text-gray-400 tracking-wider border-b pb-1.5 mb-3 flex items-center space-x-1.5">
            <span className="h-2 w-2 rounded-full bg-[#48B6AD]"></span>
            <span>Contact Details</span>
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block font-semibold mb-1">Contact Person Name</label>
              <input
                type="text"
                name="contactPersonName"
                value={formData.contactPersonName}
                onChange={handleChange}
                placeholder="Full name"
                className="w-full rounded border border-gray-300 px-3 py-2 outline-none focus:border-green-500"
              />
            </div>

            <div>
              <label className="block font-semibold mb-1">Contact Person Mobile</label>
              <input
                type="text"
                name="contactPersonMobile"
                value={formData.contactPersonMobile}
                onChange={handleChange}
                placeholder="e.g. 9825123456"
                className="w-full rounded border border-gray-300 px-3 py-2 outline-none focus:border-green-500"
              />
            </div>

            <div>
              <label className="block font-semibold mb-1">Contact Person Email</label>
              <input
                type="email"
                name="contactPersonEmail"
                value={formData.contactPersonEmail}
                onChange={handleChange}
                placeholder="contact@company.com"
                className="w-full rounded border border-gray-300 px-3 py-2 outline-none focus:border-green-500"
              />
            </div>
          </div>
        </div>

        {/* Section 4: Payment Details */}
        <div>
          <h3 className="font-bold text-xs uppercase text-gray-400 tracking-wider border-b pb-1.5 mb-3 flex items-center space-x-1.5">
            <span className="h-2 w-2 rounded-full bg-[#8972A8]"></span>
            <span>Payment & Credit Terms</span>
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
            <div>
              <label className="block font-semibold mb-1">Opening Balance</label>
              <input
                type="number"
                name="openingBalance"
                min="0"
                step="0.01"
                value={formData.openingBalance}
                onChange={handleChange}
                className="w-full rounded border border-gray-300 px-3 py-2 outline-none focus:border-green-500"
              />
            </div>

            <div>
              <label className="block font-semibold mb-1">Status (Dr/Cr)</label>
              <select
                name="openingBalanceStatus"
                value={formData.openingBalanceStatus}
                onChange={handleChange}
                className="w-full rounded border border-gray-300 px-3 py-2 outline-none focus:border-green-500 bg-white"
              >
                <option value="debit">Debit (Dr)</option>
                <option value="credit">Credit (Cr)</option>
              </select>
            </div>

            <div>
              <label className="block font-semibold mb-1">Credit Limit (₹)</label>
              <input
                type="number"
                name="creditLimit"
                min="0"
                value={formData.creditLimit}
                onChange={handleChange}
                className="w-full rounded border border-gray-300 px-3 py-2 outline-none focus:border-green-500"
              />
            </div>

            <div>
              <label className="block font-semibold mb-1">Next Payment Days</label>
              <input
                type="number"
                name="nextInvoicePaymentDay"
                min="0"
                value={formData.nextInvoicePaymentDay}
                onChange={handleChange}
                className="w-full rounded border border-gray-300 px-3 py-2 outline-none focus:border-green-500"
              />
            </div>
          </div>
        </div>

        {/* Section 5: Shipping Details */}
        <div>
          <h3 className="font-bold text-xs uppercase text-gray-400 tracking-wider border-b pb-1.5 mb-3 flex items-center space-x-1.5">
            <span className="h-2 w-2 rounded-full bg-blue-500"></span>
            <span>Shipping Details</span>
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="sm:col-span-2">
              <label className="block font-semibold mb-1">Shipping Address</label>
              <input
                type="text"
                name="shippingAddress"
                value={formData.shippingAddress}
                onChange={handleChange}
                placeholder="Warehouse or secondary delivery destination"
                className="w-full rounded border border-gray-300 px-3 py-2 outline-none focus:border-green-500"
              />
            </div>

            <div>
              <label className="block font-semibold mb-1">Enable Shipping on Invoice</label>
              <select
                name="enableShippingOnInvoice"
                value={formData.enableShippingOnInvoice}
                onChange={handleChange}
                className="w-full rounded border border-gray-300 px-3 py-2 outline-none focus:border-green-500 bg-white"
              >
                <option value="No">No</option>
                <option value="Yes">Yes</option>
              </select>
            </div>
          </div>
        </div>

        {/* Section 6: Bank Details (Optional) */}
        <div>
          <h3 className="font-bold text-xs uppercase text-gray-400 tracking-wider border-b pb-1.5 mb-3 flex items-center space-x-1.5">
            <span className="h-2 w-2 rounded-full bg-purple-500"></span>
            <span>Bank Details — Optional</span>
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block font-semibold mb-1">Bank Name</label>
              <input
                type="text"
                name="bankName"
                value={formData.bankName}
                onChange={handleChange}
                placeholder="e.g. HDFC Bank, SBI"
                className="w-full rounded border border-gray-300 px-3 py-2 outline-none focus:border-green-500"
              />
            </div>

            <div>
              <label className="block font-semibold mb-1">Bank A/C No.</label>
              <input
                type="text"
                name="bankAccountNo"
                value={formData.bankAccountNo}
                onChange={handleChange}
                placeholder="Account number"
                className="w-full rounded border border-gray-300 px-3 py-2 outline-none focus:border-green-500"
              />
            </div>

            <div>
              <label className="block font-semibold mb-1">Bank IFSC Code</label>
              <input
                type="text"
                name="bankIfscCode"
                value={formData.bankIfscCode}
                onChange={handleChange}
                placeholder="e.g. HDFC0001234"
                className="w-full rounded border border-gray-300 px-3 py-2 outline-none focus:border-green-500 uppercase"
              />
            </div>
          </div>
        </div>

        {/* Save Button */}
        <div className="pt-4 border-t flex justify-center">
          <button
            type="submit"
            disabled={loading}
            className="rounded-lg bg-[#37AD47] hover:bg-[#2f963e] text-white px-10 py-2.5 font-bold shadow-md transition inline-flex items-center space-x-2 text-sm"
          >
            <Save className="h-4 w-4" />
            <span>{loading ? "Saving Account..." : "SAVE"}</span>
          </button>
        </div>
      </form>
    </div>
  );
}
