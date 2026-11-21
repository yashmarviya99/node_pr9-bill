import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { useSelector } from "react-redux";
import {
  FileText,
  Plus,
  Minus,
  Save,
  AlertCircle,
  CheckCircle,
  Download,
  Search,
} from "lucide-react";
import api from "../../services/api";
import { isDateInFinancialYear, formatISODate, formatDate } from "../../utils/date";
import { formatCurrency, formatNumber } from "../../utils/currency";
import toast from "react-hot-toast";

export default function JournalBook() {
  const { activeCompany } = useSelector((state) => state.company);
  const { activeFinancialYear } = useSelector((state) => state.financialYear);

  const [activeTab, setActiveTab] = useState("entry"); // 'entry' | 'list'
  const [loading, setLoading] = useState(false);
  const [accounts, setAccounts] = useState([]);

  // Form State
  const [journalDate, setJournalDate] = useState(formatISODate(new Date()));
  const [voucherNumber, setVoucherNumber] = useState("J-1");
  const [narration, setNarration] = useState("");

  const [debitRows, setDebitRows] = useState([
    { accountId: "", amount: 0, description: "" },
  ]);

  const [creditRows, setCreditRows] = useState([
    { accountId: "", amount: 0, description: "" },
  ]);

  // List State
  const [journals, setJournals] = useState([]);

  useEffect(() => {
    fetchAccounts();
  }, [activeCompany]);

  useEffect(() => {
    if (activeTab === "list") {
      fetchJournals();
    }
  }, [activeTab, activeCompany]);

  const fetchAccounts = async () => {
    try {
      const res = await api.get("/accounts");
      if (res.data?.success) {
        setAccounts(res.data.accounts || []);
      }
    } catch {
      // ignore
    }
  };

  const fetchJournals = async () => {
    try {
      setLoading(true);
      const res = await api.get("/journals");
      if (res.data?.success) {
        setJournals(res.data.journals || []);
      }
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  };

  // Debit Rows manipulation
  const handleDebitChange = (idx, field, val) => {
    const copy = [...debitRows];
    copy[idx][field] = val;
    setDebitRows(copy);
  };
  const addDebitRow = (idx) => {
    const copy = [...debitRows];
    copy.splice(idx + 1, 0, { accountId: "", amount: 0, description: "" });
    setDebitRows(copy);
  };
  const removeDebitRow = (idx) => {
    if (debitRows.length <= 1) return;
    setDebitRows(debitRows.filter((_, i) => i !== idx));
  };

  // Credit Rows manipulation
  const handleCreditChange = (idx, field, val) => {
    const copy = [...creditRows];
    copy[idx][field] = val;
    setCreditRows(copy);
  };
  const addCreditRow = (idx) => {
    const copy = [...creditRows];
    copy.splice(idx + 1, 0, { accountId: "", amount: 0, description: "" });
    setCreditRows(copy);
  };
  const removeCreditRow = (idx) => {
    if (creditRows.length <= 1) return;
    setCreditRows(creditRows.filter((_, i) => i !== idx));
  };

  // Totals & Validation (Page 29)
  const totalDebit = debitRows.reduce((acc, r) => acc + Number(r.amount || 0), 0);
  const totalCredit = creditRows.reduce((acc, r) => acc + Number(r.amount || 0), 0);
  const isBalanced = Math.abs(totalDebit - totalCredit) < 0.01 && totalDebit > 0;

  const handleSave = async () => {
    if (!isDateInFinancialYear(journalDate, activeFinancialYear)) {
      toast.error("Change the Financial Year");
      return;
    }
    if (debitRows.some((r) => !r.accountId || Number(r.amount) <= 0)) {
      toast.error("Please select account and valid amount for all Debit rows");
      return;
    }
    if (creditRows.some((r) => !r.accountId || Number(r.amount) <= 0)) {
      toast.error("Please select account and valid amount for all Credit rows");
      return;
    }
    if (!isBalanced) {
      toast.error("Total Debit amount must equal Total Credit amount!");
      return;
    }

    try {
      setLoading(true);
      const res = await api.post("/journals", {
        journalNumber: voucherNumber,
        journalDate,
        narration: narration.trim(),
        debitEntries: debitRows.map((r) => ({
          account: r.accountId,
          amount: Number(r.amount),
          narration: r.description,
        })),
        creditEntries: creditRows.map((r) => ({
          account: r.accountId,
          amount: Number(r.amount),
          narration: r.description,
        })),
      });

      if (res.data?.success) {
        toast.success("Journal voucher saved successfully!");
        setDebitRows([{ accountId: "", amount: 0, description: "" }]);
        setCreditRows([{ accountId: "", amount: 0, description: "" }]);
        setNarration("");
        setVoucherNumber(`J-${Date.now().toString().slice(-4)}`);
        setActiveTab("list");
        fetchJournals();
      }
    } catch (err) {
      toast.error(err.message || "Failed to save journal voucher");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-4 max-w-6xl mx-auto animate-in fade-in">
      {/* Title Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-white px-5 py-3 rounded-xl shadow-sm border border-gray-200">
        <div className="flex items-center space-x-2">
          <div className="p-2 bg-blue-50 text-blue-600 rounded-lg">
            <FileText className="h-5 w-5" />
          </div>
          <div>
            <h2 className="font-extrabold text-sm sm:text-base tracking-wide text-gray-800 uppercase">
              {activeTab === "entry" ? "JOURNAL ENTRY FORM" : "JOURNAL VOUCHER LIST"}
            </h2>
            <p className="text-[11px] text-gray-400">
              Double-Entry General Journal • FY {activeFinancialYear?.name || "2026-27"}
            </p>
          </div>
        </div>

        <button
          onClick={() => setActiveTab(activeTab === "entry" ? "list" : "entry")}
          className="rounded bg-[#FBBC4B] hover:bg-[#e0a63e] text-gray-900 px-4 py-1.5 text-xs font-bold shadow-sm transition"
        >
          {activeTab === "entry" ? "JOURNAL LIST" : "+ JOURNAL ENTRY"}
        </button>
      </div>

      {activeTab === "entry" ? (
        /* 1. Header & Two-Side Layout (Page 29) */
        <div className="space-y-4">
          {/* Header Controls */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5 grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs text-gray-700">
            <div>
              <label className="block font-semibold mb-1">Date</label>
              <input
                type="date"
                value={journalDate}
                onChange={(e) => setJournalDate(e.target.value)}
                className="w-full rounded border border-gray-300 px-3 py-2 outline-none focus:border-green-500"
              />
            </div>
            <div>
              <label className="block font-semibold mb-1">Voucher No.</label>
              <input
                type="text"
                value={voucherNumber}
                onChange={(e) => setVoucherNumber(e.target.value)}
                className="w-full rounded border border-gray-200 bg-gray-50 px-3 py-2 font-mono font-bold text-gray-800 outline-none"
              />
            </div>
            <div>
              <label className="block font-semibold mb-1">Narration / General Details</label>
              <input
                type="text"
                value={narration}
                onChange={(e) => setNarration(e.target.value)}
                placeholder="Reason or notes"
                className="w-full rounded border border-gray-300 px-3 py-2 outline-none focus:border-green-500"
              />
            </div>
          </div>

          {/* Two Main Sides: Left = Debit (Udhar), Right = Credit (Jama) */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Left Side: Debit (Udhar) */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 space-y-3 text-xs">
              <div className="flex items-center justify-between border-b pb-2">
                <span className="font-extrabold text-sm text-blue-700 uppercase">
                  Debit (Udhar) Side
                </span>
                <span className="font-bold text-gray-600">Total: {formatCurrency(totalDebit)}</span>
              </div>

              <div className="space-y-2">
                {debitRows.map((r, idx) => (
                  <div key={idx} className="p-2.5 rounded-lg border bg-gray-50 space-y-2">
                    <div className="flex items-center space-x-2">
                      <select
                        value={r.accountId}
                        onChange={(e) => handleDebitChange(idx, "accountId", e.target.value)}
                        className="flex-1 rounded border border-gray-300 px-2 py-1.5 outline-none bg-white font-semibold text-xs"
                      >
                        <option value="">-- Select Debit Account --</option>
                        {accounts.map((a) => (
                          <option key={a._id} value={a._id}>
                            {a.name}
                          </option>
                        ))}
                      </select>

                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        placeholder="Amount (₹)"
                        value={r.amount}
                        onChange={(e) => handleDebitChange(idx, "amount", e.target.value)}
                        className="w-28 text-right rounded border border-gray-300 px-2 py-1.5 font-bold outline-none text-xs"
                      />

                      <button
                        type="button"
                        onClick={() => addDebitRow(idx)}
                        className="rounded bg-green-600 text-white p-1 hover:bg-green-700"
                      >
                        <Plus className="h-3 w-3" />
                      </button>
                      {idx > 0 && (
                        <button
                          type="button"
                          onClick={() => removeDebitRow(idx)}
                          className="rounded bg-red-500 text-white p-1 hover:bg-red-600"
                        >
                          <Minus className="h-3 w-3" />
                        </button>
                      )}
                    </div>

                    <input
                      type="text"
                      placeholder="Optional Narration / Description"
                      value={r.description}
                      onChange={(e) => handleDebitChange(idx, "description", e.target.value)}
                      className="w-full rounded border border-gray-200 px-2 py-1 outline-none text-xs"
                    />
                  </div>
                ))}
              </div>
            </div>

            {/* Right Side: Credit (Jama) */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 space-y-3 text-xs">
              <div className="flex items-center justify-between border-b pb-2">
                <span className="font-extrabold text-sm text-green-700 uppercase">
                  Credit (Jama) Side
                </span>
                <span className="font-bold text-gray-600">Total: {formatCurrency(totalCredit)}</span>
              </div>

              <div className="space-y-2">
                {creditRows.map((r, idx) => (
                  <div key={idx} className="p-2.5 rounded-lg border bg-gray-50 space-y-2">
                    <div className="flex items-center space-x-2">
                      <select
                        value={r.accountId}
                        onChange={(e) => handleCreditChange(idx, "accountId", e.target.value)}
                        className="flex-1 rounded border border-gray-300 px-2 py-1.5 outline-none bg-white font-semibold text-xs"
                      >
                        <option value="">-- Select Credit Account --</option>
                        {accounts.map((a) => (
                          <option key={a._id} value={a._id}>
                            {a.name}
                          </option>
                        ))}
                      </select>

                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        placeholder="Amount (₹)"
                        value={r.amount}
                        onChange={(e) => handleCreditChange(idx, "amount", e.target.value)}
                        className="w-28 text-right rounded border border-gray-300 px-2 py-1.5 font-bold outline-none text-xs"
                      />

                      <button
                        type="button"
                        onClick={() => addCreditRow(idx)}
                        className="rounded bg-green-600 text-white p-1 hover:bg-green-700"
                      >
                        <Plus className="h-3 w-3" />
                      </button>
                      {idx > 0 && (
                        <button
                          type="button"
                          onClick={() => removeCreditRow(idx)}
                          className="rounded bg-red-500 text-white p-1 hover:bg-red-600"
                        >
                          <Minus className="h-3 w-3" />
                        </button>
                      )}
                    </div>

                    <input
                      type="text"
                      placeholder="Optional Narration / Description"
                      value={r.description}
                      onChange={(e) => handleCreditChange(idx, "description", e.target.value)}
                      className="w-full rounded border border-gray-200 px-2 py-1 outline-none text-xs"
                    />
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Validation Status Bar & Save */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 flex flex-wrap items-center justify-between gap-3 text-xs">
            <div className="flex items-center space-x-3">
              {isBalanced ? (
                <div className="flex items-center space-x-1.5 text-green-700 font-bold bg-green-50 px-3 py-1.5 rounded-lg border border-green-200">
                  <CheckCircle className="h-4 w-4" />
                  <span>Balanced! Debit ₹{formatNumber(totalDebit)} = Credit ₹{formatNumber(totalCredit)}</span>
                </div>
              ) : (
                <div className="flex items-center space-x-1.5 text-red-700 font-bold bg-red-50 px-3 py-1.5 rounded-lg border border-red-200">
                  <AlertCircle className="h-4 w-4" />
                  <span>
                    Debit (₹{formatNumber(totalDebit)}) ≠ Credit (₹{formatNumber(totalCredit)}). Difference: ₹{formatNumber(Math.abs(totalDebit - totalCredit))}
                  </span>
                </div>
              )}
            </div>

            <button
              type="button"
              disabled={loading || !isBalanced}
              onClick={handleSave}
              className="rounded-lg bg-[#37AD47] hover:bg-[#2f963e] text-white px-8 py-2.5 font-bold shadow-md transition inline-flex items-center space-x-1.5 disabled:opacity-50"
            >
              <Save className="h-4 w-4" />
              <span>SAVE JOURNAL ENTRY</span>
            </button>
          </div>
        </div>
      ) : (
        /* Journal Voucher List */
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead className="bg-[#4A4A4A] text-white font-bold">
                <tr>
                  <th className="py-2.5 px-3 border-r border-gray-600 w-12 text-center">SR.</th>
                  <th className="py-2.5 px-3 border-r border-gray-600">Voucher No.</th>
                  <th className="py-2.5 px-3 border-r border-gray-600">Date</th>
                  <th className="py-2.5 px-3 border-r border-gray-600">Debit Accounts</th>
                  <th className="py-2.5 px-3 border-r border-gray-600">Credit Accounts</th>
                  <th className="py-2.5 px-3 border-r border-gray-600 text-right">Amount (₹)</th>
                  <th className="py-2.5 px-3">Narration</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 text-gray-700">
                {loading ? (
                  <tr>
                    <td colSpan="7" className="text-center py-10 text-gray-400">Loading journals...</td>
                  </tr>
                ) : journals.length === 0 ? (
                  <tr>
                    <td colSpan="7" className="text-center py-10 text-gray-400">No journal vouchers created yet.</td>
                  </tr>
                ) : (
                  journals.map((j, idx) => (
                    <tr key={j._id} className="hover:bg-[#E9EFFF]/40 transition">
                      <td className="py-2 px-3 border-r border-gray-100 text-center font-bold text-gray-500">{idx + 1}</td>
                      <td className="py-2 px-3 border-r border-gray-100 font-mono font-bold text-gray-900">{j.journalNumber}</td>
                      <td className="py-2 px-3 border-r border-gray-100">{formatDate(j.journalDate)}</td>
                      <td className="py-2 px-3 border-r border-gray-100 font-medium">
                        {(j.debitEntries || []).map((d) => d.account?.name || "Account").join(", ")}
                      </td>
                      <td className="py-2 px-3 border-r border-gray-100 font-medium">
                        {(j.creditEntries || []).map((c) => c.account?.name || "Account").join(", ")}
                      </td>
                      <td className="py-2 px-3 border-r border-gray-100 text-right font-black text-gray-900">
                        {formatCurrency(j.totalAmount)}
                      </td>
                      <td className="py-2 px-3 text-gray-600">{j.narration || "—"}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
