import React, { useState, useEffect } from "react";
import { useSelector } from "react-redux";
import {
  TrendingDown,
  TrendingUp,
  DollarSign,
  Plus,
  Save,
  Coffee,
  Wrench,
  Building,
  Recycle,
} from "lucide-react";
import api from "../../../services/api";
import { formatCurrency } from "../../../utils/currency";
import { formatDate, formatISODate } from "../../../utils/date";
import toast from "react-hot-toast";

export default function OtherTransactions({ type = "expense" }) {
  // type: 'expense' | 'sale' | 'saving'
  const isExpense = type === "expense";
  const isSale = type === "sale";
  const isSaving = type === "saving";

  const { activeCompany } = useSelector((state) => state.company);
  const { activeFinancialYear } = useSelector((state) => state.financialYear);

  const [loading, setLoading] = useState(false);
  const [cashBankAccounts, setCashBankAccounts] = useState([]);
  const [history, setHistory] = useState([]);

  // Form State
  const [category, setCategory] = useState(
    isExpense ? "Tea / Refreshment" : isSale ? "Scrap" : "Bank Fixed Deposit"
  );
  const [amount, setAmount] = useState("");
  const [paymentMode, setPaymentMode] = useState("Cash");
  const [selectedBookAccount, setSelectedBookAccount] = useState("");
  const [narration, setNarration] = useState("");
  const [date, setDate] = useState(formatISODate(new Date()));

  useEffect(() => {
    fetchCashBankAccounts();
    fetchHistory();
  }, [activeCompany, type]);

  const fetchCashBankAccounts = async () => {
    try {
      const res = await api.get("/accounts");
      if (res.data?.success) {
        const filtered = (res.data.accounts || []).filter(
          (a) => a.accountType === "cash" || a.accountType === "bank"
        );
        setCashBankAccounts(filtered);
        if (filtered.length > 0) {
          setSelectedBookAccount(filtered[0]._id);
        }
      }
    } catch {
      // ignore
    }
  };

  const fetchHistory = async () => {
    try {
      setLoading(true);
      const endpoint = isExpense ? "/expenses" : "/incomes";
      const res = await api.get(endpoint);
      if (res.data?.success) {
        // Backend returns: { success: true, data: { expenses/incomes: [...] } }
        const d = res.data.data || res.data;
        setHistory(isExpense ? (d.expenses || []) : (d.incomes || []));
      }
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!amount || Number(amount) <= 0) {
      toast.error("Please enter a valid amount");
      return;
    }

    // Derive paymentMode & bankName from the selected cash/bank account
    const selectedAccObj = cashBankAccounts.find((a) => a._id === selectedBookAccount);
    const derivedType = selectedAccObj ? selectedAccObj.accountType.toLowerCase() : "cash";
    // Map: cash -> cash, bank -> bank, upi -> upi etc.
    const derivedPaymentMode = derivedType === "bank" ? "bank" : "cash";
    const derivedBankName = derivedType === "bank" ? (selectedAccObj?.name || "") : "";

    try {
      setLoading(true);

      if (isExpense) {
        await api.post("/expenses", {
          accountId: selectedBookAccount,
          expenseAccountId: null,          // backend will auto-resolve from category
          category,
          expenseDate: date,
          amount: Number(amount),
          paymentMode: derivedPaymentMode,
          bankName: derivedBankName,
          narration: `Other Expense [${category}]${narration ? ": " + narration : ""}`.trim(),
        });
        toast.success(`Other Expense (${category}) saved to ${selectedAccObj?.name || paymentMode} Book!`);
      } else {
        await api.post("/incomes", {
          accountId: selectedBookAccount,
          incomeAccountId: null,           // backend will auto-resolve from category
          category,
          incomeDate: date,
          amount: Number(amount),
          paymentMode: derivedPaymentMode,
          bankName: derivedBankName,
          narration: `${isSaving ? "Saving Entry" : "Other Sale"} [${category}]${narration ? ": " + narration : ""}`.trim(),
        });
        toast.success(`${isSaving ? "Saving" : "Other Sale"} recorded successfully!`);
      }

      setAmount("");
      setNarration("");
      fetchHistory();
    } catch (err) {
      toast.error(err.message || "Failed to save transaction");
    } finally {
      setLoading(false);
    }
  };

  const expenseCategories = [
    "Tea / Refreshment",
    "Office Repairing",
    "Office Expenses",
    "Maintenance",
    "Stationery",
    "Staff Welfare",
    "Miscellaneous Expenses",
  ];

  const saleCategories = [
    "Scrap",
    "Pasti / Old Newspaper",
    "Waste Material",
    "Packing Material Sale",
    "Other Non-Core Sale",
  ];

  const savingCategories = [
    "Recurring Deposit",
    "Fixed Deposit",
    "Mutual Fund / SIP",
    "Emergency Savings Fund",
  ];

  const categories = isExpense
    ? expenseCategories
    : isSale
    ? saleCategories
    : savingCategories;

  return (
    <div className="space-y-4 max-w-5xl mx-auto animate-in fade-in">
      {/* Title */}
      <div className="flex items-center justify-between bg-white px-5 py-3 rounded-xl shadow-sm border border-gray-200">
        <div className="flex items-center space-x-2">
          <div
            className={`p-2 rounded-lg ${
              isExpense
                ? "bg-red-50 text-red-600"
                : isSale
                ? "bg-green-50 text-[#2BC481]"
                : "bg-purple-50 text-purple-600"
            }`}
          >
            {isExpense ? <TrendingDown className="h-5 w-5" /> : isSale ? <TrendingUp className="h-5 w-5" /> : <DollarSign className="h-5 w-5" />}
          </div>
          <div>
            <h2 className="font-extrabold text-sm sm:text-base tracking-wide text-gray-800 uppercase">
              {isExpense ? "OTHER EXPENSE MODULE" : isSale ? "OTHER SALE MODULE" : "SAVING MANAGEMENT"}
            </h2>
            <p className="text-[11px] text-gray-400">
              {isExpense
                ? "Record Tea, Repairing, Office & Misc Expenses with Cash/Bank Flow"
                : isSale
                ? "Record Scrap, Pasti & Waste Material Sales with Cash/Bank Receipt"
                : "Record Savings, Fixed Deposits & Contingency Reserves"}
            </p>
          </div>
        </div>
      </div>

      {/* Entry Form */}
      <form onSubmit={handleSubmit} className="bg-white rounded-xl shadow-sm border border-gray-200 p-5 space-y-4 text-xs text-gray-700">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div>
            <label className="block font-semibold mb-1">Date</label>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="w-full rounded border border-gray-300 px-3 py-2 outline-none focus:border-green-500"
            />
          </div>

          <div>
            <label className="block font-semibold mb-1">Category / Type</label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="w-full rounded border border-gray-300 px-3 py-2 outline-none focus:border-green-500 bg-white font-semibold"
            >
              {categories.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block font-semibold mb-1">Amount (₹) *</label>
            <input
              type="number"
              min="0.01"
              step="0.01"
              required
              placeholder="0.00"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="w-full rounded border border-gray-300 px-3 py-2 outline-none focus:border-green-500 font-bold text-sm"
            />
          </div>

          <div>
            <label className="block font-semibold mb-1">Payment / Receipt Mode</label>
            <select
              value={paymentMode}
              onChange={(e) => setPaymentMode(e.target.value)}
              className="w-full rounded border border-gray-300 px-3 py-2 outline-none focus:border-green-500 bg-white"
            >
              <option value="Cash">Cash Book</option>
              <option value="Bank">Bank Book</option>
            </select>
          </div>

          <div className="sm:col-span-2">
            <label className="block font-semibold mb-1">Cash / Bank Account</label>
            <select
              value={selectedBookAccount}
              onChange={(e) => setSelectedBookAccount(e.target.value)}
              className="w-full rounded border border-gray-300 px-3 py-2 outline-none focus:border-green-500 bg-white"
            >
              {cashBankAccounts.map((cb) => (
                <option key={cb._id} value={cb._id}>
                  {cb.name} ({cb.accountType.toUpperCase()})
                </option>
              ))}
            </select>
          </div>

          <div className="sm:col-span-2">
            <label className="block font-semibold mb-1">Narration / Description</label>
            <input
              type="text"
              placeholder="e.g. Office tea bill for visitors, scrap sold to vendor"
              value={narration}
              onChange={(e) => setNarration(e.target.value)}
              className="w-full rounded border border-gray-300 px-3 py-2 outline-none focus:border-green-500"
            />
          </div>
        </div>

        <div className="flex justify-end pt-3 border-t">
          <button
            type="submit"
            disabled={loading}
            className="rounded-lg bg-[#37AD47] hover:bg-[#2f963e] text-white px-8 py-2 font-bold shadow text-xs inline-flex items-center space-x-1.5"
          >
            <Save className="h-4 w-4" />
            <span>SAVE ENTRY</span>
          </button>
        </div>
      </form>

      {/* History Table */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="px-5 py-3 border-b bg-[#4A4A4A] text-white font-bold text-xs uppercase">
          Recent {isExpense ? "Expense" : isSale ? "Sale" : "Saving"} Transactions
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead className="bg-gray-100 text-gray-700 font-bold border-b">
              <tr>
                <th className="py-2.5 px-3 border-r w-12 text-center">SR.</th>
                <th className="py-2.5 px-3 border-r">Date</th>
                <th className="py-2.5 px-3 border-r">Description / Category</th>
                <th className="py-2.5 px-3 border-r">Account</th>
                <th className="py-2.5 px-3 text-right">Amount</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 text-gray-700">
              {history.length === 0 ? (
                <tr>
                  <td colSpan="5" className="text-center py-8 text-gray-400">
                    No entries recorded yet.
                  </td>
                </tr>
              ) : (
                history.slice(0, 15).map((h, idx) => (
                  <tr key={idx} className="hover:bg-[#E9EFFF]/40 transition">
                    <td className="py-2 px-3 border-r text-center font-bold text-gray-500">{idx + 1}</td>
                    <td className="py-2 px-3 border-r">{formatDate(h.expenseDate || h.incomeDate || h.createdAt)}</td>
                    <td className="py-2 px-3 border-r font-medium text-gray-800">{h.narration || "General Entry"}</td>
                    <td className="py-2 px-3 border-r uppercase text-[10px] font-bold text-gray-600">
                      {h.paymentMode || "Cash"}
                    </td>
                    <td className={`py-2 px-3 text-right font-black ${isExpense ? "text-red-600" : "text-green-700"}`}>
                      {formatCurrency(h.amount)}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
