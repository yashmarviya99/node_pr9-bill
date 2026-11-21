import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import authApi from "../../services/authApi";
import { Building, User, Phone, MapPin, CreditCard, Shield, CheckCircle } from "lucide-react";

const initialBusinessForm = {
  // User Credentials
  name: "",
  ownerName: "",
  username: "",
  email: "",
  password: "",
  confirmPassword: "",
  mobileNumber: "",
  secondMobileNumber: "",

  // Company Details (Page 1 of PDF)
  companyName: "",
  branchName: "Main Branch",
  gstNumber: "",
  businessType: "retail", // wholesale, retail, both
  businessOperation: "sale", // sale, production
  state: "Gujarat",
  city: "Rajkot",
  address: "",
  paymentMethod: "online",
};

const initialAdminForm = {
  verifierUsername: "",
  verifierPassword: "",
  email: "",
  username: "",
  password: "",
  confirmPassword: "",
};

export default function Register() {
  const navigate = useNavigate();

  const [accountType, setAccountType] = useState("business"); // default to business
  const [businessForm, setBusinessForm] = useState(initialBusinessForm);
  const [adminForm, setAdminForm] = useState(initialAdminForm);

  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(false);

  const clearMessages = () => {
    setError("");
    setSuccess("");
  };

  const handleAccountType = (type) => {
    clearMessages();
    setAccountType(type);
  };

  const handleBusinessChange = (event) => {
    const { name, value } = event.target;
    setBusinessForm((prev) => ({
      ...prev,
      [name]: value,
    }));
    clearMessages();
  };

  const handleAdminChange = (event) => {
    const { name, value } = event.target;
    setAdminForm((prev) => ({
      ...prev,
      [name]: value,
    }));
    clearMessages();
  };

  const handleBusinessSubmit = async (event) => {
    event.preventDefault();
    clearMessages();

    const {
      name,
      ownerName,
      username,
      email,
      password,
      confirmPassword,
      mobileNumber,
      secondMobileNumber,
      companyName,
      branchName,
      gstNumber,
      businessType,
      businessOperation,
      state,
      city,
      address,
      paymentMethod,
    } = businessForm;

    if (!name.trim() || !username.trim() || !email.trim() || !password || !confirmPassword) {
      setError("Please fill in all required account fields.");
      return;
    }

    if (name.trim().length < 2) {
      setError("Name must be at least 2 characters.");
      return;
    }

    if (username.trim().length < 3) {
      setError("Username must be at least 3 characters.");
      return;
    }

    if (password.length < 6) {
      setError("Password must be at least 6 characters.");
      return;
    }

    if (password !== confirmPassword) {
      setError("Password and confirm password do not match.");
      return;
    }

    setLoading(true);

    try {
      const response = await authApi.register({
        name: name.trim(),
        ownerName: ownerName.trim() || name.trim(),
        username: username.trim().toLowerCase(),
        email: email.trim().toLowerCase(),
        password,
        confirmPassword,
        mobileNumber: mobileNumber.trim(),
        secondMobileNumber: secondMobileNumber.trim(),
        companyName: companyName.trim(),
        branchName: branchName.trim() || "Main Branch",
        gstNumber: gstNumber.trim().toUpperCase(),
        businessType,
        businessOperation,
        state: state.trim() || "Gujarat",
        city: city.trim() || "Rajkot",
        address: address.trim(),
        paymentMethod,
      });

      if (!response?.success) {
        setError(response?.message || "Registration failed. Please try again.");
        return;
      }

      setSuccess(
        response?.message || "Business account registered successfully. Please proceed with payment."
      );

      setBusinessForm(initialBusinessForm);

      setTimeout(() => {
        navigate("/login", { replace: true });
      }, 1500);
    } catch (apiError) {
      setError(
        apiError?.response?.data?.message ||
          apiError?.message ||
          "Registration failed. Please try again."
      );
    } finally {
      setLoading(false);
    }
  };

  const handleAdminSubmit = async (event) => {
    event.preventDefault();
    clearMessages();

    const { verifierUsername, verifierPassword, email, username, password, confirmPassword } = adminForm;

    if (!email.trim() || !username.trim() || !password || !confirmPassword) {
      setError("Please fill in all required fields.");
      return;
    }

    if (password !== confirmPassword) {
      setError("Password and confirm password do not match.");
      return;
    }

    setLoading(true);

    try {
      const response = await authApi.adminRegister({
        verifierUsername: verifierUsername.trim(),
        verifierPassword,
        email: email.trim().toLowerCase(),
        username: username.trim().toLowerCase(),
        password,
        confirmPassword,
      });

      if (!response?.success) {
        setError(response?.message || "Admin registration failed.");
        return;
      }

      setSuccess(response?.message || "Admin account created successfully.");
      setAdminForm(initialAdminForm);

      setTimeout(() => {
        navigate("/login", { replace: true });
      }, 1500);
    } catch (apiError) {
      setError(
        apiError?.response?.data?.message ||
          apiError?.message ||
          "Admin registration failed."
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#3f3f3f] px-3 py-6 sm:px-6 flex items-center justify-center">
      <div className="w-full max-w-2xl">
        <div className="rounded-2xl bg-white px-5 py-7 shadow-2xl sm:px-8 border border-gray-100">
          {/* Logo */}
          <div className="mb-6 flex justify-center">
            <img
              src="/business-bill-logo.png"
              alt="BUSINESS BILL"
              className="h-auto w-52 object-contain sm:w-56"
            />
          </div>

          {/* Account Type Toggle */}
          <div className="mb-6 flex items-center justify-between border-b pb-3">
            <div>
              <h1 className="text-xl sm:text-2xl font-bold text-gray-800">
                {accountType === "admin" ? "Admin Registration" : "Business User Registration"}
              </h1>
              <p className="text-xs text-gray-500 mt-0.5">
                {accountType === "admin"
                  ? "Requires existing administrator verification."
                  : "Fill in your personal and business details to get started."}
              </p>
            </div>

            <button
              type="button"
              onClick={() => handleAccountType(accountType === "admin" ? "business" : "admin")}
              className="text-xs font-semibold text-[#37AD47] hover:underline"
            >
              {accountType === "admin" ? "← Business User" : "Admin Signup →"}
            </button>
          </div>

          {/* Messages */}
          {error && (
            <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-xs sm:text-sm text-red-700">
              {error}
            </div>
          )}

          {success && (
            <div className="mb-4 rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-xs sm:text-sm text-green-700">
              {success}
            </div>
          )}

          {/* ── BUSINESS REGISTRATION FORM (Page 1 of PDF) ── */}
          {accountType === "business" && (
            <form onSubmit={handleBusinessSubmit} className="space-y-4">
              {/* SECTION 1: Company & Business Details (from PDF) */}
              <div className="rounded-xl border border-gray-200 bg-gray-50/70 p-4 space-y-3">
                <div className="flex items-center space-x-2 text-xs font-bold text-[#37AD47] uppercase tracking-wider">
                  <Building className="h-4 w-4" />
                  <span>Business & Company Information (PDF Spec)</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">
                      Company Name *
                    </label>
                    <input
                      type="text"
                      name="companyName"
                      value={businessForm.companyName}
                      onChange={handleBusinessChange}
                      placeholder="e.g. Yash Enterprise"
                      className="w-full rounded-lg border border-gray-300 px-3 py-2 text-xs sm:text-sm text-gray-800 outline-none focus:border-[#37AD47] focus:ring-1 focus:ring-[#37AD47]"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">
                      GST No. (Optional)
                    </label>
                    <input
                      type="text"
                      name="gstNumber"
                      value={businessForm.gstNumber}
                      onChange={handleBusinessChange}
                      placeholder="e.g. 24ABCDE1234F1Z5"
                      className="w-full rounded-lg border border-gray-300 px-3 py-2 text-xs sm:text-sm uppercase text-gray-800 outline-none focus:border-[#37AD47] focus:ring-1 focus:ring-[#37AD47]"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">
                      Owner Name
                    </label>
                    <input
                      type="text"
                      name="ownerName"
                      value={businessForm.ownerName}
                      onChange={handleBusinessChange}
                      placeholder="e.g. Marviya Yash"
                      className="w-full rounded-lg border border-gray-300 px-3 py-2 text-xs sm:text-sm text-gray-800 outline-none focus:border-[#37AD47] focus:ring-1 focus:ring-[#37AD47]"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">
                      Branch Name
                    </label>
                    <input
                      type="text"
                      name="branchName"
                      value={businessForm.branchName}
                      onChange={handleBusinessChange}
                      placeholder="e.g. Head Office / Rajkot Branch"
                      className="w-full rounded-lg border border-gray-300 px-3 py-2 text-xs sm:text-sm text-gray-800 outline-none focus:border-[#37AD47] focus:ring-1 focus:ring-[#37AD47]"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">
                      Type of Business
                    </label>
                    <select
                      name="businessType"
                      value={businessForm.businessType}
                      onChange={handleBusinessChange}
                      className="w-full rounded-lg border border-gray-300 px-3 py-2 text-xs sm:text-sm text-gray-800 outline-none focus:border-[#37AD47]"
                    >
                      <option value="retail">Retail</option>
                      <option value="wholesale">Wholesale</option>
                      <option value="both">Both (Wholesale & Retail)</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">
                      Business Can Do
                    </label>
                    <select
                      name="businessOperation"
                      value={businessForm.businessOperation}
                      onChange={handleBusinessChange}
                      className="w-full rounded-lg border border-gray-300 px-3 py-2 text-xs sm:text-sm text-gray-800 outline-none focus:border-[#37AD47]"
                    >
                      <option value="sale">Only Sale</option>
                      <option value="production">Production & Sale</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">
                      State (Drop Down)
                    </label>
                    <select
                      name="state"
                      value={businessForm.state}
                      onChange={handleBusinessChange}
                      className="w-full rounded-lg border border-gray-300 px-3 py-2 text-xs sm:text-sm text-gray-800 outline-none focus:border-[#37AD47]"
                    >
                      <option value="Gujarat">Gujarat (State Code 24)</option>
                      <option value="Maharashtra">Maharashtra (State Code 27)</option>
                      <option value="Rajasthan">Rajasthan (State Code 08)</option>
                      <option value="Delhi">Delhi (State Code 07)</option>
                      <option value="Madhya Pradesh">Madhya Pradesh (State Code 23)</option>
                      <option value="Other">Other</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">
                      District / City
                    </label>
                    <input
                      type="text"
                      name="city"
                      value={businessForm.city}
                      onChange={handleBusinessChange}
                      placeholder="e.g. Rajkot"
                      className="w-full rounded-lg border border-gray-300 px-3 py-2 text-xs sm:text-sm text-gray-800 outline-none focus:border-[#37AD47]"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">
                    Address (Text Box)
                  </label>
                  <textarea
                    name="address"
                    rows={2}
                    value={businessForm.address}
                    onChange={handleBusinessChange}
                    placeholder="Shop/Office No, Street, Landmark..."
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-xs sm:text-sm text-gray-800 outline-none focus:border-[#37AD47]"
                  />
                </div>
              </div>

              {/* SECTION 2: User Account Credentials */}
              <div className="rounded-xl border border-gray-200 bg-white p-4 space-y-3">
                <div className="flex items-center space-x-2 text-xs font-bold text-gray-700 uppercase tracking-wider">
                  <User className="h-4 w-4 text-[#8972A8]" />
                  <span>User Login Details</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">
                      Contact Name *
                    </label>
                    <input
                      type="text"
                      name="name"
                      required
                      value={businessForm.name}
                      onChange={handleBusinessChange}
                      placeholder="Your Full Name"
                      className="w-full rounded-lg border border-gray-300 px-3 py-2 text-xs sm:text-sm text-gray-800 outline-none focus:border-[#37AD47]"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">
                      Username *
                    </label>
                    <input
                      type="text"
                      name="username"
                      required
                      value={businessForm.username}
                      onChange={handleBusinessChange}
                      placeholder="e.g. yash99"
                      className="w-full rounded-lg border border-gray-300 px-3 py-2 text-xs sm:text-sm text-gray-800 outline-none focus:border-[#37AD47]"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">
                      Email *
                    </label>
                    <input
                      type="email"
                      name="email"
                      required
                      value={businessForm.email}
                      onChange={handleBusinessChange}
                      placeholder="email@example.com"
                      className="w-full rounded-lg border border-gray-300 px-3 py-2 text-xs sm:text-sm text-gray-800 outline-none focus:border-[#37AD47]"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">
                      Mobile Number
                    </label>
                    <input
                      type="tel"
                      name="mobileNumber"
                      value={businessForm.mobileNumber}
                      onChange={handleBusinessChange}
                      placeholder="e.g. 9824419911"
                      className="w-full rounded-lg border border-gray-300 px-3 py-2 text-xs sm:text-sm text-gray-800 outline-none focus:border-[#37AD47]"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">
                      Second Mobile
                    </label>
                    <input
                      type="tel"
                      name="secondMobileNumber"
                      value={businessForm.secondMobileNumber}
                      onChange={handleBusinessChange}
                      placeholder="Optional"
                      className="w-full rounded-lg border border-gray-300 px-3 py-2 text-xs sm:text-sm text-gray-800 outline-none focus:border-[#37AD47]"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">
                      Password *
                    </label>
                    <input
                      type="password"
                      name="password"
                      required
                      minLength={6}
                      value={businessForm.password}
                      onChange={handleBusinessChange}
                      placeholder="Min 6 characters"
                      className="w-full rounded-lg border border-gray-300 px-3 py-2 text-xs sm:text-sm text-gray-800 outline-none focus:border-[#37AD47]"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">
                      Confirm Password *
                    </label>
                    <input
                      type="password"
                      name="confirmPassword"
                      required
                      value={businessForm.confirmPassword}
                      onChange={handleBusinessChange}
                      placeholder="Re-enter password"
                      className="w-full rounded-lg border border-gray-300 px-3 py-2 text-xs sm:text-sm text-gray-800 outline-none focus:border-[#37AD47]"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">
                    Preferred Payment Method
                  </label>
                  <select
                    name="paymentMethod"
                    value={businessForm.paymentMethod}
                    onChange={handleBusinessChange}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-xs sm:text-sm text-gray-800 outline-none focus:border-[#37AD47]"
                  >
                    <option value="online">Online Payment (UPI / NetBanking)</option>
                    <option value="card">Credit / Debit Card</option>
                    <option value="bank_transfer">Bank Transfer (NEFT / IMPS)</option>
                    <option value="other">Other Supported Method</option>
                  </select>
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full rounded-lg bg-[#37AD47] px-4 py-3 font-bold text-white shadow-md transition hover:bg-[#2f963e] focus:outline-none focus:ring-2 focus:ring-[#37AD47]/30 disabled:opacity-60 text-sm"
              >
                {loading ? "Creating Account..." : "Create Business Account"}
              </button>
            </form>
          )}

          {/* ── ADMIN REGISTRATION FORM ── */}
          {accountType === "admin" && (
            <form onSubmit={handleAdminSubmit} className="space-y-4">
              <div className="rounded-xl border border-purple-200 bg-purple-50/50 p-4 space-y-3">
                <div className="flex items-center space-x-2 text-xs font-bold text-purple-700 uppercase tracking-wider">
                  <Shield className="h-4 w-4" />
                  <span>Existing Admin Verification</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">
                      Verifier Admin Username
                    </label>
                    <input
                      type="text"
                      name="verifierUsername"
                      value={adminForm.verifierUsername}
                      onChange={handleAdminChange}
                      placeholder="Existing admin username"
                      className="w-full rounded-lg border border-gray-300 px-3 py-2 text-xs sm:text-sm text-gray-800 outline-none focus:border-purple-600"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">
                      Verifier Admin Password
                    </label>
                    <input
                      type="password"
                      name="verifierPassword"
                      value={adminForm.verifierPassword}
                      onChange={handleAdminChange}
                      placeholder="Existing admin password"
                      className="w-full rounded-lg border border-gray-300 px-3 py-2 text-xs sm:text-sm text-gray-800 outline-none focus:border-purple-600"
                    />
                  </div>
                </div>
              </div>

              <div className="rounded-xl border border-gray-200 bg-white p-4 space-y-3">
                <div className="text-xs font-bold text-gray-700 uppercase tracking-wider">
                  New Admin Credentials
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">
                      New Admin Username *
                    </label>
                    <input
                      type="text"
                      name="username"
                      required
                      value={adminForm.username}
                      onChange={handleAdminChange}
                      placeholder="admin_username"
                      className="w-full rounded-lg border border-gray-300 px-3 py-2 text-xs sm:text-sm text-gray-800 outline-none focus:border-purple-600"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">
                      New Admin Email *
                    </label>
                    <input
                      type="email"
                      name="email"
                      required
                      value={adminForm.email}
                      onChange={handleAdminChange}
                      placeholder="admin@example.com"
                      className="w-full rounded-lg border border-gray-300 px-3 py-2 text-xs sm:text-sm text-gray-800 outline-none focus:border-purple-600"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">
                      Password *
                    </label>
                    <input
                      type="password"
                      name="password"
                      required
                      minLength={6}
                      value={adminForm.password}
                      onChange={handleAdminChange}
                      placeholder="Min 6 characters"
                      className="w-full rounded-lg border border-gray-300 px-3 py-2 text-xs sm:text-sm text-gray-800 outline-none focus:border-purple-600"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">
                      Confirm Password *
                    </label>
                    <input
                      type="password"
                      name="confirmPassword"
                      required
                      value={adminForm.confirmPassword}
                      onChange={handleAdminChange}
                      placeholder="Re-enter password"
                      className="w-full rounded-lg border border-gray-300 px-3 py-2 text-xs sm:text-sm text-gray-800 outline-none focus:border-purple-600"
                    />
                  </div>
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full rounded-lg bg-purple-600 px-4 py-3 font-bold text-white shadow-md transition hover:bg-purple-700 focus:outline-none disabled:opacity-60 text-sm"
              >
                {loading ? "Creating Admin..." : "Register as Administrator"}
              </button>
            </form>
          )}

          {/* Login Link */}
          <div className="mt-6 text-center text-xs text-gray-500">
            Already have an account?{" "}
            <Link to="/login" className="font-bold text-[#37AD47] hover:underline">
              Login here
            </Link>
          </div>
        </div>

        <p className="mt-4 text-center text-xs text-gray-300">© BUSINESS BILL</p>
      </div>
    </div>
  );
}
