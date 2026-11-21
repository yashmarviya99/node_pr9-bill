import React, { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { useSelector } from "react-redux";
import { BookOpen, Search, Download, Calendar, ArrowLeft } from "lucide-react";
import api from "../../services/api";
import { isDateInFinancialYear, formatISODate, formatDate } from "../../utils/date";
import { formatCurrency, formatNumber } from "../../utils/currency";

export default function LedgerDetails() {
  const [searchParams] = useSearchParams();
  const initialAccountId = searchParams.get("accountId") || "";

  const { activeCompany } = useSelector((state) => state.company);
  const { activeFinancialYear, financialYears } = useSelector((state) => state.financialYear);

  const [loading, setLoading] = useState(false);
  const [downloadingPdf, setDownloadingPdf] = useState(false);
  const [accounts, setAccounts] = useState([]);
  const [selectedAccountId, setSelectedAccountId] = useState(initialAccountId);
  const [selectedFYId, setSelectedFYId] = useState(activeFinancialYear?._id || "");
  const [fromDate, setFromDate] = useState(
    activeFinancialYear?.startDate ? formatISODate(activeFinancialYear.startDate) : "2026-04-01"
  );
  const [toDate, setToDate] = useState(formatISODate(new Date()));

  const [ledgerData, setLedgerData] = useState({
    account: null,
    openingBalance: 0,
    openingBalanceType: "debit",
    entries: [],
  });

  useEffect(() => {
    fetchAccounts();
  }, [activeCompany]);

  useEffect(() => {
    if (selectedAccountId) {
      fetchLedgerDetails();
    }
  }, [selectedAccountId, selectedFYId, activeCompany]);

  const handleFYChange = (newFYId) => {
    setSelectedFYId(newFYId);
    if (newFYId) {
      const fy = financialYears.find((f) => f._id === newFYId);
      if (fy) {
        if (fy.startDate) setFromDate(formatISODate(fy.startDate));
        if (fy.endDate) setToDate(formatISODate(fy.endDate));
      }
    }
  };

  const fetchAccounts = async () => {
    try {
      const res = await api.get("/accounts");
      if (res.data?.success) {
        const list = res.data.accounts || [];
        setAccounts(list);
        if (!selectedAccountId && list.length > 0) {
          setSelectedAccountId(list[0]._id);
        }
      }
    } catch (err) {
      console.error("Failed to fetch accounts", err);
    }
  };

  const fetchLedgerDetails = async () => {
    if (!selectedAccountId) return;
    try {
      setLoading(true);
      const res = await api.get("/ledger/details", {
        params: {
          accountId: selectedAccountId,
          financialYearId: selectedFYId || undefined,
          fromDate,
          toDate,
        },
      });
      if (res.data?.success) {
        const rawLedger = res.data.ledger || {};
        const entries =
          res.data.entries ||
          res.data.details ||
          rawLedger.entries ||
          rawLedger.details ||
          [];

        let opBal = 0;
        let opType = "debit";
        if (typeof rawLedger.openingBalance === "number") {
          opBal = rawLedger.openingBalance;
          opType = rawLedger.openingBalanceType || "debit";
        } else if (res.data.openingBalance) {
          const ob = res.data.openingBalance;
          if (typeof ob === "number") {
            opBal = ob;
          } else {
            const deb = Number(ob.debit || 0);
            const cred = Number(ob.credit || 0);
            const diff = deb - cred;
            opBal = Math.abs(diff);
            opType = diff >= 0 ? "debit" : "credit";
          }
        }

        setLedgerData({
          account: res.data.account || rawLedger.account || null,
          openingBalance: opBal,
          openingBalanceType: opType,
          entries,
          totals: res.data.totals || rawLedger.totals || null,
        });
      }
    } catch (err) {
      console.error("Failed to fetch ledger details", err);
    } finally {
      setLoading(false);
    }
  };

  const handleDownloadPdf = async () => {
    if (!selectedAccountId) return;
    try {
      setDownloadingPdf(true);
      const res = await api.get("/ledger/details/pdf", {
        params: {
          accountId: selectedAccountId,
          financialYearId: selectedFYId || undefined,
          fromDate,
          toDate,
        },
        responseType: "blob",
      });
      const blob = new Blob([res.data], { type: "application/pdf" });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `ledger-details-${selectedAccountObj?.name || "account"}.pdf`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (err) {
      console.error("PDF download failed, falling back to print", err);
      window.print();
    } finally {
      setDownloadingPdf(false);
    }
  };

  const handleSearch = (e) => {
    e.preventDefault();
    fetchLedgerDetails();
  };

  // Calculate Running Balance for each entry (Page 32)
  let currentRunningBalance = Number(ledgerData.openingBalance || 0);
  if (ledgerData.openingBalanceType === "credit") {
    currentRunningBalance = -currentRunningBalance;
  }

  const entriesWithRunningBalance = (ledgerData.entries || []).map((entry) => {
    const debit = Number(entry.debit || 0);
    const credit = Number(entry.credit || 0);
    currentRunningBalance = currentRunningBalance + debit - credit;
    return {
      ...entry,
      runningBalance: currentRunningBalance,
    };
  });

  const totalDebit = entriesWithRunningBalance.reduce((acc, it) => acc + Number(it.debit || 0), 0);
  const totalCredit = entriesWithRunningBalance.reduce((acc, it) => acc + Number(it.credit || 0), 0);

  const selectedAccountObj = accounts.find((a) => a._id === selectedAccountId);

  return (
    <div className="space-y-4 animate-in fade-in">
      {/* 1. Filter Section (Page 31) */}
      <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-200">
        <form onSubmit={handleSearch} className="flex flex-wrap items-end gap-3 text-xs">
          {/* Account Dropdown in Center */}
          <div className="flex-1 min-w-[240px]">
            <label className="block font-semibold text-gray-700 mb-1">Select Account</label>
            <select
              value={selectedAccountId}
              onChange={(e) => setSelectedAccountId(e.target.value)}
              className="w-full rounded border border-gray-300 px-3 py-1.5 outline-none focus:border-green-500 bg-white font-bold text-gray-900"
            >
              {accounts.map((acc) => (
                <option key={acc._id} value={acc._id}>
                  {acc.name} ({acc.accountType?.toUpperCase()})
                </option>
              ))}
            </select>
          </div>

          {/* Date range on right */}
          <div className="w-36">
            <label className="block font-semibold text-gray-700 mb-1">From Date</label>
            <input
              type="date"
              value={fromDate}
              onChange={(e) => setFromDate(e.target.value)}
              className="w-full rounded border border-gray-300 px-2 py-1.5 outline-none"
            />
          </div>

          <div className="w-36">
            <label className="block font-semibold text-gray-700 mb-1">To Date</label>
            <input
              type="date"
              value={toDate}
              onChange={(e) => setToDate(e.target.value)}
              className="w-full rounded border border-gray-300 px-2 py-1.5 outline-none"
            />
          </div>

          {/* Financial Year Dropdown */}
          <div className="w-40">
            <label className="block font-semibold text-gray-700 mb-1">Financial Year</label>
            <select
              value={selectedFYId}
              onChange={(e) => handleFYChange(e.target.value)}
              className="w-full rounded border border-gray-300 px-2 py-1.5 outline-none bg-white"
            >
              <option value="">Current FY</option>
              {financialYears.map((fy) => (
                <option key={fy._id} value={fy._id}>
                  {fy.name}
                </option>
              ))}
            </select>
          </div>

          <button
            type="submit"
            className="rounded bg-[#37AD47] hover:bg-[#2f963e] text-white px-6 py-1.5 font-bold shadow transition inline-flex items-center space-x-1 h-[32px]"
          >
            <Search className="h-3.5 w-3.5" />
            <span>SEARCH</span>
          </button>
        </form>
      </div>

      {/* 2. Header Bar with PDF Button (Page 31) */}
      <div className="flex items-center justify-between bg-white px-5 py-3 rounded-xl shadow-sm border border-gray-200">
        <div className="flex items-center space-x-2">
          <div className="p-2 bg-green-50 text-[#37AD47] rounded-lg">
            <BookOpen className="h-5 w-5" />
          </div>
          <div>
            <h2 className="font-extrabold text-sm sm:text-base tracking-wide text-gray-800 uppercase">
              LEDGER DETAILS: {selectedAccountObj?.name || "ACCOUNT"}
            </h2>
            <p className="text-[11px] text-gray-400">
              Period: {formatDate(fromDate)} to {formatDate(toDate)}
            </p>
          </div>
        </div>

        <button
          onClick={handleDownloadPdf}
          disabled={downloadingPdf}
          className="rounded bg-gray-700 hover:bg-gray-800 disabled:opacity-50 text-white px-4 py-1.5 text-xs font-bold shadow-sm transition inline-flex items-center space-x-1"
        >
          <Download className="h-3.5 w-3.5" />
          <span>{downloadingPdf ? "DOWNLOADING..." : "PDF"}</span>
        </button>
      </div>

      {/* 3. Ledger Details Table (Page 32) */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead className="bg-[#4A4A4A] text-white font-bold">
              <tr>
                <th className="py-2.5 px-3 border-r border-gray-600 w-12 text-center">SR.</th>
                <th className="py-2.5 px-3 border-r border-gray-600 w-24">Date</th>
                <th className="py-2.5 px-3 border-r border-gray-600 w-36">Invoice / Voucher No.</th>
                <th className="py-2.5 px-3 border-r border-gray-600">Particulars (Transaction Type & Narration)</th>
                <th className="py-2.5 px-3 border-r border-gray-600 text-right w-28">Debit (₹)</th>
                <th className="py-2.5 px-3 border-r border-gray-600 text-right w-28">Credit (₹)</th>
                <th className="py-2.5 px-3 text-right w-32">Running Balance (₹)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 text-gray-700">
              {/* 4. Opening Balance Row (Page 32) */}
              <tr className="bg-amber-50/50 font-bold text-gray-800">
                <td className="py-2 px-3 border-r border-gray-200 text-center font-bold">—</td>
                <td className="py-2 px-3 border-r border-gray-200">{formatDate(fromDate)}</td>
                <td className="py-2 px-3 border-r border-gray-200 font-mono text-[11px]">OPENING</td>
                <td className="py-2 px-3 border-r border-gray-200 uppercase font-black tracking-wide text-gray-700">
                  OPENING BALANCE CARRIED FORWARD
                </td>
                <td className="py-2 px-3 border-r border-gray-200 text-right">
                  {ledgerData.openingBalanceType === "debit" ? formatCurrency(ledgerData.openingBalance) : "—"}
                </td>
                <td className="py-2 px-3 border-r border-gray-200 text-right">
                  {ledgerData.openingBalanceType === "credit" ? formatCurrency(ledgerData.openingBalance) : "—"}
                </td>
                <td className="py-2 px-3 text-right font-black text-gray-900">
                  {formatCurrency(Math.abs(ledgerData.openingBalance || 0))}{" "}
                  {ledgerData.openingBalanceType === "credit" ? "Cr" : "Dr"}
                </td>
              </tr>

              {/* Transactions */}
              {loading ? (
                <tr>
                  <td colSpan="7" className="text-center py-10 text-gray-400">
                    Loading account ledger...
                  </td>
                </tr>
              ) : entriesWithRunningBalance.length === 0 ? (
                <tr>
                  <td colSpan="7" className="text-center py-8 text-gray-400">
                    No transactions recorded for this period.
                  </td>
                </tr>
              ) : (
                entriesWithRunningBalance.map((item, idx) => (
                  <tr key={idx} className="hover:bg-[#E9EFFF]/40 transition">
                    <td className="py-2 px-3 border-r border-gray-100 text-center font-bold text-gray-500">
                      {idx + 1}
                    </td>
                    <td className="py-2 px-3 border-r border-gray-100">{formatDate(item.date)}</td>
                    <td className="py-2 px-3 border-r border-gray-100 font-mono font-bold text-gray-900">
                      {item.voucherNumber || item.invoiceNumber || "—"}
                    </td>
                    <td className="py-2 px-3 border-r border-gray-100">
                      <span className="font-bold text-gray-900 uppercase tracking-tight">
                        {item.type || item.particulars || "Transaction"}
                      </span>
                      {item.narration && (
                        <span className="text-gray-500 ml-2 font-normal">• {item.narration}</span>
                      )}
                    </td>
                    <td className="py-2 px-3 border-r border-gray-100 text-right font-bold text-blue-700">
                      {item.debit > 0 ? formatCurrency(item.debit) : "—"}
                    </td>
                    <td className="py-2 px-3 border-r border-gray-100 text-right font-bold text-green-700">
                      {item.credit > 0 ? formatCurrency(item.credit) : "—"}
                    </td>
                    <td className="py-2 px-3 text-right font-black text-gray-900">
                      {formatCurrency(Math.abs(item.runningBalance))}{" "}
                      {item.runningBalance >= 0 ? "Dr" : "Cr"}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
            {/* Total Row (Page 32) */}
            <tfoot className="border-t-2 border-gray-800 bg-gray-50 font-black text-gray-900">
              <tr>
                <td colSpan="4" className="py-2.5 px-3 border-r text-right uppercase">
                  TOTAL
                </td>
                <td className="py-2.5 px-3 border-r text-right text-blue-900">{formatCurrency(totalDebit)}</td>
                <td className="py-2.5 px-3 border-r text-right text-green-900">{formatCurrency(totalCredit)}</td>
                <td className="py-2.5 px-3 text-right text-gray-900 font-black">
                  {formatCurrency(Math.abs(currentRunningBalance))}{" "}
                  {currentRunningBalance >= 0 ? "Dr" : "Cr"}
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>
    </div>
  );
}
