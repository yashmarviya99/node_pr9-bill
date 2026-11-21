import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../../services/api";
import toast from "react-hot-toast";
import { Building, Plus, CheckCircle, ArrowRight, ShieldCheck, RefreshCw } from "lucide-react";

export default function CompanySelect() {
  const navigate = useNavigate();

  const [companies, setCompanies] = useState([]);
  const [selectedCompany, setSelectedCompany] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [user, setUser] = useState(null);

  // Toggle for creating company right on this page
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [savingCompany, setSavingCompany] = useState(false);

  // Form fields for new company
  const [formData, setFormData] = useState({
    companyName: "",
    businessType: "Retail",
    gstNumber: "",
    phone: "",
    email: "",
    address: "",
    city: "Rajkot",
    state: "Gujarat",
    pincode: "360001",
    country: "India",
  });

  const loadPage = async () => {
    setLoading(true);
    setError("");

    try {
      // 1. Verify user status
      const meRes = await api.get("/auth/me");
      if (!meRes?.data?.success) {
        navigate("/login", { replace: true });
        return;
      }

      const currentUser = meRes.data.user;
      setUser(currentUser);

      const isPaymentVerified = currentUser?.paymentStatus === "verified";
      const isRegistrationActive = currentUser?.registrationStatus === "active";
      const isSubscriptionActive = currentUser?.subscriptionStatus === "active";
      const isAccountActive = currentUser?.isActive === true;

      // Allow admin or verified business users
      const canProceed =
        currentUser?.role === "admin" ||
        (isPaymentVerified && isRegistrationActive && isSubscriptionActive && isAccountActive);

      if (!canProceed) {
        navigate("/payment", { replace: true });
        return;
      }

      // 2. Fetch companies
      const companyRes = await api.get("/companies");
      const list = companyRes?.data?.companies || [];
      setCompanies(list);

      if (list.length > 0) {
        setSelectedCompany(list[0]._id);
        setShowCreateForm(false);
      } else {
        // If no company exists, show create form directly
        setShowCreateForm(true);
      }
    } catch (apiError) {
      const status = apiError?.response?.status;
      if (status === 401) {
        navigate("/login", { replace: true });
        return;
      }
      if (status === 403) {
        navigate("/payment", { replace: true });
        return;
      }
      setError(
        apiError?.response?.data?.message ||
          apiError?.message ||
          "Unable to load company selection."
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPage();
  }, [navigate]);

  const handleSelectAndContinue = (companyId) => {
    const idToUse = companyId || selectedCompany;
    if (!idToUse) {
      setError("Please select a company to continue.");
      return;
    }

    const chosen = companies.find((c) => c._id === idToUse);
    sessionStorage.setItem("businessBillActiveCompanyId", idToUse);

    if (chosen?.branches?.length > 0) {
      sessionStorage.setItem("businessBillActiveBranchId", chosen.branches[0]._id);
    }

    toast.success(`Selected ${chosen?.companyName || "company"}`);
    navigate("/dashboard", { replace: true });
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    setError("");
  };

  const handleCreateCompanySubmit = async (e) => {
    e.preventDefault();
    setError("");

    if (!formData.companyName.trim()) {
      setError("Company Name is required.");
      return;
    }

    try {
      setSavingCompany(true);
      const res = await api.post("/companies", {
        companyName: formData.companyName.trim(),
        businessType: formData.businessType.trim(),
        gstNumber: formData.gstNumber.trim().toUpperCase(),
        phone: formData.phone.trim(),
        email: formData.email.trim(),
        address: formData.address.trim(),
        city: formData.city.trim(),
        state: formData.state.trim(),
        pincode: formData.pincode.trim(),
        country: formData.country.trim() || "India",
      });

      if (res.data?.success && res.data?.company) {
        const newComp = res.data.company;
        toast.success("Company created successfully!");

        // Auto select the new company and store in session
        sessionStorage.setItem("businessBillActiveCompanyId", newComp._id);
        if (newComp.branches?.length > 0) {
          sessionStorage.setItem("businessBillActiveBranchId", newComp.branches[0]._id);
        }

        navigate("/dashboard", { replace: true });
      } else {
        setError(res.data?.message || "Failed to create company.");
      }
    } catch (err) {
      setError(
        err?.response?.data?.message ||
          err?.message ||
          "Failed to create company. Please verify details."
      );
    } finally {
      setSavingCompany(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#3f3f3f] px-4 py-8 flex items-center justify-center">
        <div className="w-full max-w-lg rounded-2xl bg-white px-6 py-10 text-center shadow-2xl">
          <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-[#37AD47] border-t-transparent mb-3" />
          <p className="text-sm font-semibold text-gray-700">Loading your companies...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#3f3f3f] px-4 py-8 sm:px-6 flex items-center justify-center">
      <div className="w-full max-w-xl rounded-2xl bg-white px-6 py-7 shadow-2xl sm:px-8 transition-all">
        {/* Logo */}
        <div className="mb-6 flex justify-center">
          <img
            src="/business-bill-logo.png"
            alt="BUSINESS BILL"
            className="h-auto w-52 object-contain sm:w-56"
          />
        </div>

        {/* Title */}
        <div className="text-center mb-6">
          <h1 className="text-2xl font-bold text-gray-800">
            {showCreateForm ? "Create New Company" : "Select Company"}
          </h1>
          <p className="mt-1 text-xs sm:text-sm text-gray-500">
            {showCreateForm
              ? "Set up your business profile to start billing and accounting"
              : "Choose the business account you want to work with today"}
          </p>
        </div>

        {/* Error Alert */}
        {error && (
          <div className="mb-5 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        )}

        {/* ── MODE 1: Select Existing Company ── */}
        {!showCreateForm && companies.length > 0 && (
          <div className="space-y-4">
            <div className="flex items-center justify-between pb-1 border-b">
              <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
                Available Companies ({companies.length})
              </span>
              <button
                type="button"
                onClick={() => {
                  setShowCreateForm(true);
                  setError("");
                }}
                className="flex items-center space-x-1 text-xs font-bold text-[#37AD47] hover:underline"
              >
                <Plus className="h-3.5 w-3.5" />
                <span>+ Create New Company</span>
              </button>
            </div>

            {/* Company Cards List */}
            <div className="space-y-2.5 max-h-72 overflow-y-auto pr-1">
              {companies.map((comp) => {
                const isSelected = selectedCompany === comp._id;
                return (
                  <div
                    key={comp._id}
                    onClick={() => {
                      setSelectedCompany(comp._id);
                      setError("");
                    }}
                    className={`cursor-pointer rounded-xl border-2 p-4 transition-all flex items-center justify-between ${
                      isSelected
                        ? "border-[#37AD47] bg-[#E9EFFF]/60 shadow-sm"
                        : "border-gray-200 hover:border-gray-300 hover:bg-gray-50"
                    }`}
                  >
                    <div className="flex items-center space-x-3.5">
                      <div
                        className={`flex h-11 w-11 items-center justify-center rounded-xl text-sm font-bold shadow-sm ${
                          isSelected
                            ? "bg-[#37AD47] text-white"
                            : "bg-gray-100 text-gray-700 border border-gray-200"
                        }`}
                      >
                        <Building className="h-5 w-5" />
                      </div>
                      <div>
                        <div className="font-bold text-sm text-gray-900 flex items-center gap-1.5">
                          <span>{comp.companyName}</span>
                          {comp.businessType && (
                            <span className="rounded bg-gray-100 px-1.5 py-0.5 text-[10px] text-gray-600 font-normal">
                              {comp.businessType}
                            </span>
                          )}
                        </div>
                        <div className="text-xs text-gray-500 mt-0.5">
                          {comp.city || "Rajkot"}, {comp.state || "Gujarat"}
                          {comp.gstNumber ? ` • GST: ${comp.gstNumber}` : ""}
                        </div>
                      </div>
                    </div>

                    <div className="shrink-0 pl-2">
                      {isSelected ? (
                        <CheckCircle className="h-6 w-6 text-[#37AD47]" />
                      ) : (
                        <div className="h-5 w-5 rounded-full border-2 border-gray-300" />
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Action Buttons */}
            <div className="pt-3 space-y-2">
              <button
                type="button"
                onClick={() => handleSelectAndContinue()}
                className="w-full flex items-center justify-center space-x-2 rounded-lg bg-[#37AD47] px-4 py-3 font-semibold text-white shadow-sm transition hover:bg-[#2f963e]"
              >
                <span>Continue to Dashboard</span>
                <ArrowRight className="h-4 w-4" />
              </button>

              <button
                type="button"
                onClick={() => {
                  setShowCreateForm(true);
                  setError("");
                }}
                className="w-full text-center text-xs font-semibold text-gray-600 hover:text-[#37AD47] py-1"
              >
                Need another company? <span className="underline">Create a new company here</span>
              </button>
            </div>
          </div>
        )}

        {/* ── MODE 2: Inline Company Creation Form ("a jgyaej") ── */}
        {showCreateForm && (
          <form onSubmit={handleCreateCompanySubmit} className="space-y-4 animate-in fade-in">
            {companies.length > 0 && (
              <div className="flex justify-between items-center pb-2 border-b">
                <span className="text-xs font-semibold text-gray-500">NEW BUSINESS DETAILS</span>
                <button
                  type="button"
                  onClick={() => {
                    setShowCreateForm(false);
                    setError("");
                  }}
                  className="text-xs text-gray-600 hover:text-gray-900 underline"
                >
                  ← Choose Existing Company ({companies.length})
                </button>
              </div>
            )}

            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">
                Company / Business Name *
              </label>
              <input
                type="text"
                name="companyName"
                required
                value={formData.companyName}
                onChange={handleInputChange}
                placeholder="e.g. BHARAT WOOD CORPORATION"
                className="w-full rounded-lg border border-gray-300 px-3.5 py-2.5 text-sm text-gray-800 outline-none focus:border-[#37AD47] focus:ring-2 focus:ring-[#37AD47]/20"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  Business Type
                </label>
                <select
                  name="businessType"
                  value={formData.businessType}
                  onChange={handleInputChange}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-800 outline-none focus:border-[#37AD47]"
                >
                  <option value="Retail">Retail</option>
                  <option value="Wholesale">Wholesale</option>
                  <option value="Manufacturing">Manufacturing</option>
                  <option value="Trader">Trader</option>
                  <option value="Services">Services</option>
                  <option value="Other">Other</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  GSTIN (Optional)
                </label>
                <input
                  type="text"
                  name="gstNumber"
                  value={formData.gstNumber}
                  onChange={handleInputChange}
                  placeholder="e.g. 24ABCDE1234F1Z5"
                  maxLength={15}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm uppercase text-gray-800 outline-none focus:border-[#37AD47]"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  Phone / Mobile
                </label>
                <input
                  type="tel"
                  name="phone"
                  value={formData.phone}
                  onChange={handleInputChange}
                  placeholder="e.g. 9876543210"
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-800 outline-none focus:border-[#37AD47]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  Email
                </label>
                <input
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleInputChange}
                  placeholder="company@example.com"
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-800 outline-none focus:border-[#37AD47]"
                />
              </div>
            </div>

            <div className="grid grid-cols-3 gap-2">
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">City</label>
                <input
                  type="text"
                  name="city"
                  value={formData.city}
                  onChange={handleInputChange}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-800 outline-none focus:border-[#37AD47]"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">State</label>
                <input
                  type="text"
                  name="state"
                  value={formData.state}
                  onChange={handleInputChange}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-800 outline-none focus:border-[#37AD47]"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Pincode</label>
                <input
                  type="text"
                  name="pincode"
                  value={formData.pincode}
                  onChange={handleInputChange}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-800 outline-none focus:border-[#37AD47]"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">
                Office / Shop Address
              </label>
              <textarea
                name="address"
                rows={2}
                value={formData.address}
                onChange={handleInputChange}
                placeholder="Shop No, Street, Landmark..."
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-800 outline-none focus:border-[#37AD47]"
              />
            </div>

            <div className="pt-2 flex gap-2">
              {companies.length > 0 && (
                <button
                  type="button"
                  onClick={() => {
                    setShowCreateForm(false);
                    setError("");
                  }}
                  className="w-1/3 rounded-lg border border-gray-300 px-4 py-3 font-semibold text-gray-700 hover:bg-gray-50 text-sm"
                >
                  Cancel
                </button>
              )}
              <button
                type="submit"
                disabled={savingCompany}
                className={`rounded-lg bg-[#37AD47] px-4 py-3 font-semibold text-white shadow-sm transition hover:bg-[#2f963e] text-sm flex items-center justify-center space-x-2 ${
                  companies.length > 0 ? "w-2/3" : "w-full"
                } disabled:opacity-60`}
              >
                {savingCompany ? (
                  <>
                    <RefreshCw className="h-4 w-4 animate-spin" />
                    <span>Creating Company...</span>
                  </>
                ) : (
                  <>
                    <span>Save & Enter Dashboard</span>
                    <ArrowRight className="h-4 w-4" />
                  </>
                )}
              </button>
            </div>
          </form>
        )}

        {/* Footer info */}
        {user && (
          <div className="mt-6 pt-3 border-t border-gray-100 flex items-center justify-between text-xs text-gray-400">
            <span className="flex items-center gap-1 text-gray-500">
              <ShieldCheck className="h-3.5 w-3.5 text-[#37AD47]" />
              Logged in as <strong className="text-gray-700">@{user.username}</strong>
            </span>
            <button
              onClick={() => {
                loadPage();
                toast.success("Refreshed");
              }}
              className="text-[#37AD47] hover:underline flex items-center gap-1 font-medium"
            >
              <RefreshCw className="h-3 w-3" />
              <span>Refresh</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
