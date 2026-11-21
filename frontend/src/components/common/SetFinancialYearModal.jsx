import React, { useState, useEffect } from "react";
import { useSelector, useDispatch } from "react-redux";
import { X, Calendar, CheckCircle, Plus } from "lucide-react";
import { setActiveFinancialYear, setFinancialYears } from "../../redux/slices/financialYearSlice";
import api from "../../services/api";
import toast from "react-hot-toast";

export default function SetFinancialYearModal({ isOpen, onClose }) {
  const dispatch = useDispatch();
  const { activeFinancialYearId, financialYears } = useSelector((state) => state.financialYear);
  const { activeCompanyId } = useSelector((state) => state.company);

  const [loading, setLoading] = useState(false);
  const [fys, setFys] = useState(financialYears || []);
  const [selectedFYId, setSelectedFYId] = useState(activeFinancialYearId);
  const [showAddFY, setShowAddFY] = useState(false);
  const [newFYName, setNewFYName] = useState("2026-27");
  const [startDate, setStartDate] = useState("2026-04-01");
  const [endDate, setEndDate] = useState("2027-03-31");

  useEffect(() => {
    if (isOpen) {
      fetchFinancialYears();
      setSelectedFYId(activeFinancialYearId);
    }
  }, [isOpen, activeFinancialYearId]);

  const fetchFinancialYears = async () => {
    try {
      setLoading(true);
      const res = await api.get("/financial-years");
      if (res.data?.success) {
        setFys(res.data.financialYears || []);
        dispatch(setFinancialYears(res.data.financialYears || []));
      }
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  };

  const handleApply = () => {
    const fy = fys.find((f) => f._id === selectedFYId);
    if (!fy) {
      toast.error("Please select a financial year");
      return;
    }
    dispatch(setActiveFinancialYear(fy));
    toast.success(`Active Financial Year set to ${fy.name}`);
    onClose();
    window.location.reload();
  };

  const handleAddFY = async (e) => {
    e.preventDefault();
    try {
      setLoading(true);
      const res = await api.post("/financial-years", {
        name: newFYName.trim(),
        startDate,
        endDate,
        isCurrent: true,
      });
      if (res.data?.success) {
        toast.success("Financial Year added successfully");
        setShowAddFY(false);
        fetchFinancialYears();
      }
    } catch (err) {
      toast.error(err.message || "Failed to create financial year");
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 animate-in fade-in">
      <div className="w-full max-w-md rounded-xl bg-white shadow-2xl overflow-hidden text-gray-800">
        <div className="flex items-center justify-between bg-[#4A4A4A] px-5 py-3 text-white">
          <div className="flex items-center space-x-2">
            <Calendar className="h-5 w-5 text-amber-400" />
            <h3 className="font-bold text-sm sm:text-base">SET CURRENT FINANCIAL YEAR</h3>
          </div>
          <button onClick={onClose} className="rounded p-1 hover:bg-gray-600 transition">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="p-5">
          {!showAddFY ? (
            <>
              <div className="flex items-center justify-between mb-3">
                <p className="text-xs text-gray-500">Select active fiscal period (1 Apr to 31 Mar):</p>
                <button
                  type="button"
                  onClick={() => setShowAddFY(true)}
                  className="flex items-center space-x-1 text-xs text-[#37AD47] font-semibold hover:underline"
                >
                  <Plus className="h-3.5 w-3.5" />
                  <span>New Year</span>
                </button>
              </div>

              {loading ? (
                <div className="py-8 text-center text-xs text-gray-400">Loading periods...</div>
              ) : (
                <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                  {fys.map((f) => (
                    <div
                      key={f._id}
                      onClick={() => setSelectedFYId(f._id)}
                      className={`cursor-pointer rounded-lg border p-3 transition flex items-center justify-between ${
                        selectedFYId === f._id
                          ? "border-[#37AD47] bg-green-50/50 shadow-sm"
                          : "border-gray-200 hover:bg-gray-50"
                      }`}
                    >
                      <div className="flex items-center space-x-3">
                        <div
                          className={`flex h-8 w-8 items-center justify-center rounded-full text-xs font-bold ${
                            selectedFYId === f._id ? "bg-[#37AD47] text-white" : "bg-gray-100 text-gray-600"
                          }`}
                        >
                          <Calendar className="h-4 w-4" />
                        </div>
                        <div>
                          <div className="font-bold text-sm text-gray-900">{f.name}</div>
                          <div className="text-[11px] text-gray-500">
                            {new Date(f.startDate).toLocaleDateString("en-IN")} to{" "}
                            {new Date(f.endDate).toLocaleDateString("en-IN")}
                          </div>
                        </div>
                      </div>
                      {selectedFYId === f._id && <CheckCircle className="h-5 w-5 text-[#37AD47]" />}
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
                  Apply Financial Year
                </button>
              </div>
            </>
          ) : (
            <form onSubmit={handleAddFY} className="space-y-3">
              <h4 className="font-bold text-sm text-gray-800">Add New Financial Year</h4>
              <div>
                <label className="block text-xs font-medium text-gray-700">Financial Year Name *</label>
                <input
                  type="text"
                  required
                  value={newFYName}
                  onChange={(e) => setNewFYName(e.target.value)}
                  placeholder="e.g. 2027-28"
                  className="mt-1 w-full rounded border border-gray-300 px-3 py-1.5 text-xs outline-none focus:border-green-500"
                />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs font-medium text-gray-700">Start Date</label>
                  <input
                    type="date"
                    required
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="mt-1 w-full rounded border border-gray-300 px-3 py-1.5 text-xs outline-none focus:border-green-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700">End Date</label>
                  <input
                    type="date"
                    required
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="mt-1 w-full rounded border border-gray-300 px-3 py-1.5 text-xs outline-none focus:border-green-500"
                  />
                </div>
              </div>
              <div className="flex justify-end space-x-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddFY(false)}
                  className="rounded px-4 py-1.5 text-xs font-semibold text-gray-600 hover:bg-gray-100"
                >
                  Back
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="rounded bg-[#37AD47] px-5 py-1.5 text-xs font-semibold text-white shadow hover:bg-[#2f963e]"
                >
                  Save Year
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
