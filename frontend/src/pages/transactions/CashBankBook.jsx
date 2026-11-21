import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { useSelector } from "react-redux";
import {
  BookOpen,
  CreditCard,
  Plus,
  Minus,
  Save,
  Search,
  Download,
  Printer,
  Trash2,
  Edit2,
  AlertTriangle,
  AlertCircle,
  FileText,
} from "lucide-react";
import api from "../../services/api";
import { isDateInFinancialYear, formatISODate, formatDate } from "../../utils/date";
import { formatCurrency, formatNumber } from "../../utils/currency";
import toast from "react-hot-toast";

export default function CashBankBook({ mode = "cash" }) {
  // mode: 'cash' | 'bank'
  const isBank = mode === "bank";
  const { activeCompany } = useSelector((state) => state.company);
  const { activeFinancialYear } = useSelector((state) => state.financialYear);

  const [activeTab, setActiveTab] = useState("entry"); // 'entry' | 'list'
  const [loading, setLoading] = useState(false);

  // Accounts
  const [bookAccounts, setBookAccounts] = useState([]);
  const [selectedBookAccount, setSelectedBookAccount] = useState("");
  const [bookBalance, setBookBalance] = useState(0);
  const [partyAccounts, setPartyAccounts] = useState([]);

  // Form State
  const [entryDate, setEntryDate] = useState(formatISODate(new Date()));
  const [voucherNumber, setVoucherNumber] = useState(isBank ? "B-1" : "C-1");
  const [rows, setRows] = useState([
    {
      type: "Income", // 'Income' or 'Payment'
      accountId: "",
      ledgerBalance: 0,
      amount: 0,
      narration: "",
      chequeNo: "",
      chequeDate: formatISODate(new Date()),
      bankName: "",
    },
  ]);

  // List State
  const [fromDate, setFromDate] = useState(formatISODate(new Date()));
  const [toDate, setToDate] = useState(formatISODate(new Date()));
  const [transactions, setTransactions] = useState([]);
  const [deleteItem, setDeleteItem] = useState(null);

  useEffect(() => {
    fetchBookAccounts();
    fetchPartyAccounts();
  }, [activeCompany, mode]);

  useEffect(() => {
    if (activeTab === "list") {
      fetchList();
    }
  }, [activeTab, activeCompany]);

  const fetchBookAccounts = async () => {
    try {
      const res = await api.get("/accounts", {
        params: { accountType: isBank ? "bank" : "cash" },
      });
      if (res.data?.success) {
        const list = res.data.accounts || [];
        setBookAccounts(list);
        if (list.length > 0) {
          setSelectedBookAccount(list[0]._id);
          setBookBalance(list[0].openingBalance || 0);
        }
      }
    } catch {
      // ignore
    }
  };

  const fetchPartyAccounts = async () => {
    try {
      const res = await api.get("/accounts");
      if (res.data?.success) {
        setPartyAccounts(res.data.accounts || []);
      }
    } catch {
      // ignore
    }
  };

  const fetchList = async () => {
    try {
      setLoading(true);
      const endpoint = isBank ? "/bank-book" : "/cash-book";
      const res = await api.get(endpoint, {
        params: { fromDate, toDate },
      });
      if (res.data?.success) {
        setTransactions(res.data.transactions || []);
      }
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  };

  const handleBookAccountChange = (accId) => {
    setSelectedBookAccount(accId);
    const found = bookAccounts.find((a) => a._id === accId);
    setBookBalance(found ? found.openingBalance || 0 : 0);
  };

  const handleRowChange = (index, field, value) => {
    const updated = [...rows];
    updated[index][field] = value;

    if (field === "accountId") {
      const found = partyAccounts.find((a) => a._id === value);
      updated[index].ledgerBalance = found ? found.openingBalance || 0 : 0;
    }

    setRows(updated);
  };

  const addRow = (index) => {
    const newRow = {
      type: "Income",
      accountId: "",
      ledgerBalance: 0,
      amount: 0,
      narration: "",
      chequeNo: "",
      chequeDate: formatISODate(new Date()),
      bankName: "",
    };
    const copy = [...rows];
    copy.splice(index + 1, 0, newRow);
    setRows(copy);
  };

  const removeRow = (index) => {
    if (rows.length <= 1) return;
    const copy = rows.filter((_, i) => i !== index);
    setRows(copy);
  };

  const handleSave = async () => {
    if (!isDateInFinancialYear(entryDate, activeFinancialYear)) {
      toast.error("Change the Financial Year");
      return;
    }
    if (!selectedBookAccount) {
      toast.error(`Please select a ${isBank ? "Bank" : "Cash"} account`);
      return;
    }
    if (rows.some((r) => !r.accountId || Number(r.amount) <= 0)) {
      toast.error("Please enter a valid Account and numeric Amount for all rows");
      return;
    }

    try {
      setLoading(true);

      for (const row of rows) {
        if (row.type === "Income") {
          // Record Receipt / Income
          await api.post("/receipts", {
            accountId: row.accountId,
            receiptAccountId: selectedBookAccount,
            amount: Number(row.amount),
            receiptDate: entryDate,
            receiptNumber: voucherNumber,
            paymentMode: isBank ? "bank" : "cash",
            chequeNumber: row.chequeNo,
            chequeDate: row.chequeDate,
            bankName: row.bankName,
            narration: row.narration || `${isBank ? "Bank" : "Cash"} receipt voucher`,
          });
        } else {
          // Record Payment
          await api.post("/payments", {
            accountId: row.accountId,
            paymentAccountId: selectedBookAccount,
            amount: Number(row.amount),
            paymentDate: entryDate,
            paymentNumber: voucherNumber,
            paymentMode: isBank ? "bank" : "cash",
            chequeNumber: row.chequeNo,
            chequeDate: row.chequeDate,
            bankName: row.bankName,
            narration: row.narration || `${isBank ? "Bank" : "Cash"} payment voucher`,
          });
        }
      }

      toast.success(`${isBank ? "Bank Book" : "Cash Book"} voucher saved successfully!`);

      // Reset
      setRows([
        {
          type: "Income",
          accountId: "",
          ledgerBalance: 0,
          amount: 0,
          narration: "",
          chequeNo: "",
          chequeDate: formatISODate(new Date()),
          bankName: "",
        },
      ]);
      setVoucherNumber(isBank ? `B-${Date.now().toString().slice(-4)}` : `C-${Date.now().toString().slice(-4)}`);
      setActiveTab("list");
      fetchList();
    } catch (err) {
      toast.error(err.message || "Failed to save entry");
    } finally {
      setLoading(false);
    }
  };

  // Calculations for List
  const totalCR = transactions.reduce((acc, t) => acc + (t.type === "credit" || t.crAmount ? Number(t.crAmount || t.amount || 0) : 0), 0);
  const totalDR = transactions.reduce((acc, t) => acc + (t.type === "debit" || t.drAmount ? Number(t.drAmount || t.amount || 0) : 0), 0);

  return (
    <div className="space-y-4 max-w-6xl mx-auto animate-in fade-in">
      {/* Title Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-white px-5 py-3 rounded-xl shadow-sm border border-gray-200">
        <div className="flex items-center space-x-2">
          <div className={`p-2 rounded-lg ${isBank ? "bg-purple-50 text-[#8972A8]" : "bg-teal-50 text-[#48B6AD]"}`}>
            {isBank ? <CreditCard className="h-5 w-5" /> : <BookOpen className="h-5 w-5" />}
          </div>
          <div>
            <h2 className="font-extrabold text-sm sm:text-base tracking-wide text-gray-800 uppercase">
              {activeTab === "entry"
                ? `${isBank ? "BANK" : "CASH"} BOOK ENTRY FORM`
                : `${isBank ? "BANK" : "CASH"} BOOK LIST`}
            </h2>
            <p className="text-[11px] text-gray-400">
              Voucher Management • Financial Year {activeFinancialYear?.name || "2026-27"}
            </p>
          </div>
        </div>

        <button
          onClick={() => setActiveTab(activeTab === "entry" ? "list" : "entry")}
          className="rounded bg-[#FBBC4B] hover:bg-[#e0a63e] text-gray-900 px-4 py-1.5 text-xs font-bold shadow-sm transition inline-flex items-center space-x-1"
        >
          <FileText className="h-3.5 w-3.5" />
          <span>{activeTab === "entry" ? `${isBank ? "BANK" : "CASH"} BOOK LIST` : `+ ${isBank ? "BANK" : "CASH"} BOOK ENTRY`}</span>
        </button>
      </div>

      {activeTab === "entry" ? (
        /* ENTRY FORM (Page 26 & 28) */
        <div className="space-y-4">
          {/* Basic Details Bar */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5 grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs text-gray-700">
            <div>
              <label className="block font-semibold mb-1">Date</label>
              <input
                type="date"
                value={entryDate}
                onChange={(e) => setEntryDate(e.target.value)}
                className="w-full rounded border border-gray-300 px-3 py-2 outline-none focus:border-green-500"
              />
            </div>

            <div>
              <label className="block font-semibold mb-1">{isBank ? "Bank Book Account" : "Cash Book Account"}</label>
              <select
                value={selectedBookAccount}
                onChange={(e) => handleBookAccountChange(e.target.value)}
                className="w-full rounded border border-gray-300 px-3 py-2 outline-none focus:border-green-500 bg-white font-medium"
              >
                {bookAccounts.map((b) => (
                  <option key={b._id} value={b._id}>
                    {b.name}
                  </option>
                ))}
              </select>
              <div className="mt-1 text-[11px] font-semibold text-gray-500">
                Current Balance: <strong className="text-gray-900">{formatCurrency(bookBalance)}</strong>
              </div>
            </div>

            <div>
              <label className="block font-semibold mb-1">Voucher No.</label>
              <input
                type="text"
                value={voucherNumber}
                onChange={(e) => setVoucherNumber(e.target.value)}
                className="w-full rounded border border-gray-200 bg-gray-50 px-3 py-2 font-mono font-bold text-gray-700 outline-none"
              />
            </div>
          </div>

          {/* Table */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5 space-y-4 text-xs text-gray-700">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead className="bg-[#4A4A4A] text-white font-bold">
                  <tr>
                    <th className="py-2 px-2 border-r border-gray-600 w-8 text-center">#</th>
                    <th className="py-2 px-2 border-r border-gray-600 w-28">Income / Payment</th>
                    <th className="py-2 px-2 border-r border-gray-600 min-w-[180px]">Account</th>
                    <th className="py-2 px-2 border-r border-gray-600 w-28 text-right">Balance</th>
                    <th className="py-2 px-2 border-r border-gray-600 w-28 text-right">Amount (₹) *</th>
                    {isBank && (
                      <>
                        <th className="py-2 px-2 border-r border-gray-600 w-24">Cheque No.</th>
                        <th className="py-2 px-2 border-r border-gray-600 w-28">Cheque Date</th>
                        <th className="py-2 px-2 border-r border-gray-600 w-32">Bank Name</th>
                      </>
                    )}
                    <th className="py-2 px-2 border-r border-gray-600 min-w-[140px]">Narration</th>
                    <th className="py-2 px-2 text-center w-16">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {rows.map((row, idx) => (
                    <tr key={idx} className="hover:bg-gray-50">
                      <td className="py-2 px-2 text-center font-bold text-gray-500 border-r">{idx + 1}</td>

                      {/* Income / Payment Dropdown */}
                      <td className="py-1 px-2 border-r">
                        <select
                          value={row.type}
                          onChange={(e) => handleRowChange(idx, "type", e.target.value)}
                          className={`w-full rounded border px-2 py-1 outline-none font-bold text-xs ${
                            row.type === "Income" ? "text-green-700 bg-green-50/50" : "text-red-700 bg-red-50/50"
                          }`}
                        >
                          <option value="Income">Income (+)</option>
                          <option value="Payment">Payment (-)</option>
                        </select>
                      </td>

                      {/* Account selection */}
                      <td className="py-1 px-2 border-r">
                        <div className="flex items-center space-x-1">
                          <select
                            value={row.accountId}
                            onChange={(e) => handleRowChange(idx, "accountId", e.target.value)}
                            className="flex-1 rounded border border-gray-300 px-2 py-1 outline-none focus:border-green-500 bg-white text-xs font-semibold"
                          >
                            <option value="">-- Select Account --</option>
                            {partyAccounts.map((a) => (
                              <option key={a._id} value={a._id}>
                                {a.name}
                              </option>
                            ))}
                          </select>
                          <Link
                            to="/master/account/create"
                            className="text-blue-600 hover:underline text-[10px] font-bold"
                          >
                            New
                          </Link>
                        </div>
                      </td>

                      {/* Ledger Balance Display */}
                      <td className="py-2 px-2 border-r text-right font-medium text-gray-600">
                        {formatCurrency(row.ledgerBalance)}
                      </td>

                      {/* Amount */}
                      <td className="py-1 px-2 border-r text-right">
                        <input
                          type="number"
                          min="0.01"
                          step="0.01"
                          required
                          value={row.amount}
                          onChange={(e) => handleRowChange(idx, "amount", e.target.value)}
                          className="w-full text-right rounded border border-gray-300 px-2 py-1 font-bold outline-none focus:border-green-500 text-xs"
                        />
                      </td>

                      {/* Bank Specific Columns */}
                      {isBank && (
                        <>
                          <td className="py-1 px-2 border-r">
                            <input
                              type="text"
                              value={row.chequeNo}
                              onChange={(e) => handleRowChange(idx, "chequeNo", e.target.value)}
                              placeholder="Cheque #"
                              className="w-full rounded border border-gray-200 px-2 py-1 outline-none text-xs"
                            />
                          </td>
                          <td className="py-1 px-2 border-r">
                            <input
                              type="date"
                              value={row.chequeDate}
                              onChange={(e) => handleRowChange(idx, "chequeDate", e.target.value)}
                              className="w-full rounded border border-gray-200 px-1 py-1 outline-none text-xs"
                            />
                          </td>
                          <td className="py-1 px-2 border-r">
                            <input
                              type="text"
                              value={row.bankName}
                              onChange={(e) => handleRowChange(idx, "bankName", e.target.value)}
                              placeholder="Bank name"
                              className="w-full rounded border border-gray-200 px-2 py-1 outline-none text-xs"
                            />
                          </td>
                        </>
                      )}

                      {/* Narration */}
                      <td className="py-1 px-2 border-r">
                        <input
                          type="text"
                          value={row.narration}
                          onChange={(e) => handleRowChange(idx, "narration", e.target.value)}
                          placeholder="Details"
                          className="w-full rounded border border-gray-200 px-2 py-1 outline-none text-xs"
                        />
                      </td>

                      {/* Add/Remove */}
                      <td className="py-2 px-2 text-center">
                        <div className="flex items-center justify-center space-x-1">
                          <button
                            type="button"
                            onClick={() => addRow(idx)}
                            className="rounded bg-green-600 hover:bg-green-700 text-white p-1"
                          >
                            <Plus className="h-3 w-3" />
                          </button>
                          {idx > 0 && (
                            <button
                              type="button"
                              onClick={() => removeRow(idx)}
                              className="rounded bg-red-500 hover:bg-red-600 text-white p-1"
                            >
                              <Minus className="h-3 w-3" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="pt-4 border-t flex justify-end space-x-3">
              {isBank && (
                <button
                  type="button"
                  onClick={() => window.print()}
                  className="rounded-lg bg-purple-600 hover:bg-purple-700 text-white px-5 py-2 font-bold shadow text-xs inline-flex items-center space-x-1"
                >
                  <Printer className="h-3.5 w-3.5" />
                  <span>PRINT CHEQUE</span>
                </button>
              )}
              <button
                type="button"
                disabled={loading}
                onClick={handleSave}
                className="rounded-lg bg-[#37AD47] hover:bg-[#2f963e] text-white px-8 py-2 font-bold shadow text-xs inline-flex items-center space-x-1.5"
              >
                <Save className="h-4 w-4" />
                <span>SAVE</span>
              </button>
            </div>
          </div>
        </div>
      ) : (
        /* LIST VIEW (Page 27 & 29) */
        <div className="space-y-4">
          {/* Date Filter & Search Button */}
          <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-200">
            <div className="flex flex-wrap items-end justify-center gap-3 text-xs">
              <div>
                <label className="block font-semibold text-gray-700 mb-1">From Date</label>
                <input
                  type="date"
                  value={fromDate}
                  onChange={(e) => setFromDate(e.target.value)}
                  className="rounded border border-gray-300 px-3 py-1.5 outline-none"
                />
              </div>
              <div>
                <label className="block font-semibold text-gray-700 mb-1">To Date</label>
                <input
                  type="date"
                  value={toDate}
                  onChange={(e) => setToDate(e.target.value)}
                  className="rounded border border-gray-300 px-3 py-1.5 outline-none"
                />
              </div>
              <button
                type="button"
                onClick={fetchList}
                className="rounded bg-[#37AD47] hover:bg-[#2f963e] text-white px-6 py-1.5 font-bold shadow inline-flex items-center space-x-1 h-[32px]"
              >
                <Search className="h-3.5 w-3.5" />
                <span>SEARCH</span>
              </button>
            </div>
          </div>

          {/* List Header */}
          <div className="flex items-center justify-between bg-white px-5 py-3 rounded-xl shadow-sm border border-gray-200">
            <div className="flex items-center space-x-2">
              <h3 className="font-extrabold text-sm text-gray-800 uppercase">
                {isBank ? "BANK BOOK LIST" : "CASH BOOK LIST"}
              </h3>
            </div>
            <div className="flex items-center space-x-2">
              <button
                onClick={() => window.print()}
                className="rounded bg-gray-700 hover:bg-gray-800 text-white px-3.5 py-1.5 text-xs font-bold shadow-sm transition inline-flex items-center space-x-1"
              >
                <Download className="h-3.5 w-3.5" />
                <span>PDF</span>
              </button>
              <button
                onClick={() => setActiveTab("entry")}
                className="rounded bg-[#37AD47] hover:bg-[#2f963e] text-white px-4 py-1.5 text-xs font-bold shadow transition inline-flex items-center space-x-1"
              >
                <Plus className="h-3.5 w-3.5" />
                <span>+ {isBank ? "BANK" : "CASH"} BOOK ENTRY</span>
              </button>
            </div>
          </div>

          {/* Table */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead className="bg-[#4A4A4A] text-white font-bold">
                  <tr>
                    <th className="py-2.5 px-3 border-r border-gray-600 w-16">CR/DR</th>
                    <th className="py-2.5 px-3 border-r border-gray-600">Voucher No.</th>
                    <th className="py-2.5 px-3 border-r border-gray-600">Date</th>
                    <th className="py-2.5 px-3 border-r border-gray-600">Account Name</th>
                    <th className="py-2.5 px-3 border-r border-gray-600">{isBank ? "Bank Account" : "Cash Book"}</th>
                    <th className="py-2.5 px-3 border-r border-gray-600 text-right">CR Amount</th>
                    <th className="py-2.5 px-3 border-r border-gray-600 text-right">DR Amount</th>
                    {isBank && (
                      <>
                        <th className="py-2.5 px-3 border-r border-gray-600">Cheque No.</th>
                        <th className="py-2.5 px-3 border-r border-gray-600">Cheque Date</th>
                        <th className="py-2.5 px-3 border-r border-gray-600">Bank Name</th>
                      </>
                    )}
                    <th className="py-2.5 px-3 border-r border-gray-600">Narration</th>
                    <th className="py-2.5 px-3 text-center w-20">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 text-gray-700">
                  {loading ? (
                    <tr>
                      <td colSpan="12" className="text-center py-10 text-gray-400">
                        Loading transactions...
                      </td>
                    </tr>
                  ) : transactions.length === 0 ? (
                    <tr>
                      <td colSpan="12" className="text-center py-10 text-gray-400">
                        No transactions found for the selected period.
                      </td>
                    </tr>
                  ) : (
                    transactions.map((t, idx) => {
                      const isCredit = t.type === "credit" || t.crAmount > 0;
                      return (
                        <tr key={idx} className="hover:bg-[#E9EFFF]/40 transition">
                          <td className="py-2 px-3 border-r border-gray-100 font-bold">
                            <span className={isCredit ? "text-green-700" : "text-red-700"}>
                              {isCredit ? "CR (Income)" : "DR (Payment)"}
                            </span>
                          </td>
                          <td className="py-2 px-3 border-r border-gray-100 font-mono font-bold text-gray-900">
                            {t.voucherNumber || t.paymentNumber || t.receiptNumber}
                          </td>
                          <td className="py-2 px-3 border-r border-gray-100 text-gray-600">
                            {formatDate(t.date || t.paymentDate || t.receiptDate)}
                          </td>
                          <td className="py-2 px-3 border-r border-gray-100 font-semibold text-gray-800">
                            {t.account?.name || t.accountName}
                          </td>
                          <td className="py-2 px-3 border-r border-gray-100 text-gray-600">
                            {t.bookAccountName || (isBank ? "Bank Account" : "Cash Book")}
                          </td>
                          <td className="py-2 px-3 border-r border-gray-100 text-right font-bold text-green-700">
                            {isCredit ? formatCurrency(t.amount || t.crAmount) : "—"}
                          </td>
                          <td className="py-2 px-3 border-r border-gray-100 text-right font-bold text-red-600">
                            {!isCredit ? formatCurrency(t.amount || t.drAmount) : "—"}
                          </td>
                          {isBank && (
                            <>
                              <td className="py-2 px-3 border-r border-gray-100 font-mono">{t.chequeNumber || "—"}</td>
                              <td className="py-2 px-3 border-r border-gray-100">{formatDate(t.chequeDate) || "—"}</td>
                              <td className="py-2 px-3 border-r border-gray-100">{t.bankName || "—"}</td>
                            </>
                          )}
                          <td className="py-2 px-3 border-r border-gray-100 text-gray-600">{t.narration || "—"}</td>
                          <td className="py-2 px-3 text-center">
                            <div className="flex items-center justify-center space-x-1">
                              <button
                                onClick={() => window.print()}
                                className="p-1 text-gray-600 hover:bg-gray-100 rounded"
                                title="Print PDF"
                              >
                                <Printer className="h-3.5 w-3.5" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
                {/* Total Row (Page 27) */}
                <tfoot className="border-t-2 border-gray-800 bg-gray-50 font-black text-gray-900">
                  <tr>
                    <td colSpan="5" className="py-2 px-3 border-r text-right uppercase">
                      TOTAL
                    </td>
                    <td className="py-2 px-3 border-r text-right text-green-800">{formatCurrency(totalCR)}</td>
                    <td className="py-2 px-3 border-r text-right text-red-800">{formatCurrency(totalDR)}</td>
                    <td colSpan={isBank ? 5 : 2}></td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
