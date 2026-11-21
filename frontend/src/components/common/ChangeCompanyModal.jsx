import React, { useState, useEffect } from "react";
import { useSelector, useDispatch } from "react-redux";
import { X, Building, CheckCircle, Plus } from "lucide-react";
import { setActiveCompany, setActiveBranch, setCompanies } from "../../redux/slices/companySlice";
import api from "../../services/api";
import toast from "react-hot-toast";

export default function ChangeCompanyModal({ isOpen, onClose }) {
  const dispatch = useDispatch();
  const { activeCompanyId, activeBranchId, companies } = useSelector((state) => state.company);
  const [loading, setLoading] = useState(false);
  const [localCompanies, setLocalCompanies] = useState(companies || []);
  const [selectedCompId, setSelectedCompId] = useState(activeCompanyId);
  const [selectedBranchId, setSelectedBranchId] = useState(activeBranchId);
  const [showAddCompany, setShowAddCompany] = useState(false);
  const [newCompanyName, setNewCompanyName] = useState("");
  const [newCompanyGstin, setNewCompanyGstin] = useState("");
  const [newCompanyCity, setNewCompanyCity] = useState("Rajkot");

  useEffect(() => {
    if (isOpen) {
      fetchCompanies();
      setSelectedCompId(activeCompanyId);
      setSelectedBranchId(activeBranchId);
    }
  }, [isOpen, activeCompanyId, activeBranchId]);

  const fetchCompanies = async () => {
    try {
      setLoading(true);
      const res = await api.get("/companies");
      if (res.data?.success) {
        setLocalCompanies(res.data.companies || []);
        dispatch(setCompanies(res.data.companies || []));
      }
    } catch (err) {
      // ignore
    } finally {
      setLoading(false);
    }
  };

  const handleApply = () => {
    const comp = localCompanies.find((c) => c._id === selectedCompId);
    if (!comp) {
      toast.error("Please select a company");
      return;
    }
    dispatch(setActiveCompany(comp));
    const br = comp.branches?.find((b) => b._id === selectedBranchId) || comp.branches?.[0] || null;
    dispatch(setActiveBranch(br));
    toast.success(`Switched to ${comp.companyName}`);
    onClose();
    window.location.reload();
  };

  const handleAddCompany = async (e) => {
    e.preventDefault();
    if (!newCompanyName.trim()) {
      toast.error("Company name is required");
      return;
    }
    try {
      setLoading(true);
      const res = await api.post("/companies", {
        companyName: newCompanyName.trim(),
        gstNumber: newCompanyGstin.trim(),
        city: newCompanyCity.trim(),
        state: "Gujarat",
        country: "India",
      });
      if (res.data?.success) {
        toast.success("Company created successfully");
        setShowAddCompany(false);
        setNewCompanyName("");
        fetchCompanies();
      }
    } catch (err) {
      toast.error(err.message || "Failed to create company");
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 animate-in fade-in">
      <div className="w-full max-w-lg rounded-xl bg-white shadow-2xl overflow-hidden text-gray-800">
        <div className="flex items-center justify-between bg-[#4A4A4A] px-5 py-3 text-white">
          <div className="flex items-center space-x-2">
            <Building className="h-5 w-5 text-green-400" />
            <h3 className="font-bold text-sm sm:text-base">SELECT COMPANY / BUSINESS</h3>
          </div>
          <button onClick={onClose} className="rounded p-1 hover:bg-gray-600 transition">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="p-5">
          {!showAddCompany ? (
            <>
              <div className="flex items-center justify-between mb-3">
                <p className="text-xs text-gray-500">Select active company for your session:</p>
                <button
                  type="button"
                  onClick={() => setShowAddCompany(true)}
                  className="flex items-center space-x-1 text-xs text-[#37AD47] font-semibold hover:underline"
                >
                  <Plus className="h-3.5 w-3.5" />
                  <span>Add Company</span>
                </button>
              </div>

              {loading ? (
                <div className="py-8 text-center text-xs text-gray-400">Loading companies...</div>
              ) : (
                <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                  {localCompanies.map((c) => (
                    <div
                      key={c._id}
                      onClick={() => setSelectedCompId(c._id)}
                      className={`cursor-pointer rounded-lg border p-3 transition flex items-center justify-between ${
                        selectedCompId === c._id
                          ? "border-[#37AD47] bg-green-50/50 shadow-sm"
                          : "border-gray-200 hover:bg-gray-50"
                      }`}
                    >
                      <div className="flex items-center space-x-3">
                        <div
                          className={`flex h-8 w-8 items-center justify-center rounded-full text-xs font-bold ${
                            selectedCompId === c._id ? "bg-[#37AD47] text-white" : "bg-gray-100 text-gray-600"
                          }`}
                        >
                          {c.companyName.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <div className="font-bold text-sm text-gray-900">{c.companyName}</div>
                          <div className="text-[11px] text-gray-500">
                            {c.city || "Rajkot"}, {c.state || "Gujarat"} {c.gstNumber ? `• GST: ${c.gstNumber}` : ""}
                          </div>
                        </div>
                      </div>
                      {selectedCompId === c._id && <CheckCircle className="h-5 w-5 text-[#37AD47]" />}
                    </div>
                  ))}
                </div>
              )}

              <div className="mt-5 flex justify-end space-x-2 border-t pt-3">
                <button
                  type="button"
                  onClick={onClose}
                  className="rounded px-4 py-1.5 text-xs font-semibold text-gray-600 hover:bg-gray-100"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleApply}
                  className="rounded bg-[#37AD47] px-5 py-1.5 text-xs font-semibold text-white shadow hover:bg-[#2f963e]"
                >
                  Switch Company
                </button>
              </div>
            </>
          ) : (
            <form onSubmit={handleAddCompany} className="space-y-3">
              <h4 className="font-bold text-sm text-gray-800">Add New Company</h4>
              <div>
                <label className="block text-xs font-medium text-gray-700">Company Name *</label>
                <input
                  type="text"
                  required
                  value={newCompanyName}
                  onChange={(e) => setNewCompanyName(e.target.value)}
                  placeholder="e.g. BHARAT WOOD CORPORATION"
                  className="mt-1 w-full rounded border border-gray-300 px-3 py-1.5 text-xs outline-none focus:border-green-500"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700">GSTIN (Optional)</label>
                <input
                  type="text"
                  value={newCompanyGstin}
                  onChange={(e) => setNewCompanyGstin(e.target.value)}
                  placeholder="e.g. 24AAAPL1234F1Z5"
                  className="mt-1 w-full rounded border border-gray-300 px-3 py-1.5 text-xs outline-none focus:border-green-500"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700">City</label>
                <input
                  type="text"
                  value={newCompanyCity}
                  onChange={(e) => setNewCompanyCity(e.target.value)}
                  placeholder="e.g. Rajkot"
                  className="mt-1 w-full rounded border border-gray-300 px-3 py-1.5 text-xs outline-none focus:border-green-500"
                />
              </div>
              <div className="flex justify-end space-x-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddCompany(false)}
                  className="rounded px-4 py-1.5 text-xs font-semibold text-gray-600 hover:bg-gray-100"
                >
                  Back
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="rounded bg-[#37AD47] px-5 py-1.5 text-xs font-semibold text-white shadow hover:bg-[#2f963e]"
                >
                  Save Company
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
