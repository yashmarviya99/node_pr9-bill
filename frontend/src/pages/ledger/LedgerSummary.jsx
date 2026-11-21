import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { useSelector } from "react-redux";
import { BookOpen, Search, Download, ExternalLink, Calendar } from "lucide-react";
import api from "../../services/api";
import { formatCurrency } from "../../utils/currency";

export default function LedgerSummary() {
  const { activeCompany } = useSelector((state) => state.company);
  const { activeFinancialYear, financialYears } = useSelector((state) => state.financialYear);

  const [loading, setLoading] = useState(false);
  const [downloadingPdf, setDownloadingPdf] = useState(false);
  const [selectedFYId, setSelectedFYId] = useState(activeFinancialYear?._id || "");
  const [selectedAccountId, setSelectedAccountId] = useState("");
  const [accounts, setAccounts] = useState([]);
  const [summaryList, setSummaryList] = useState([]);

  useEffect(() => {
    fetchAccounts();
  }, [activeCompany]);

  useEffect(() => {
    fetchSummary();
  }, [activeCompany, selectedFYId]);

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

  const fetchSummary = async () => {
    try {
      setLoading(true);
      const res = await api.get("/ledger/summary", {
        params: {
          financialYearId: selectedFYId || undefined,
          accountId: selectedAccountId || undefined,
        },
      });
      if (res.data?.success) {
        setSummaryList(res.data.summary || res.data.summaries || []);
      }
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  };

  const handleDownloadPdf = async () => {
    try {
      setDownloadingPdf(true);
      const res = await api.get("/ledger/summary/pdf", {
        params: {
          financialYearId: selectedFYId || undefined,
          accountId: selectedAccountId || undefined,
        },
        responseType: "blob",
      });
      const blob = new Blob([res.data], { type: "application/pdf" });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `ledger-summary.pdf`;
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
    fetchSummary();
  };

  const filtered = summaryList.filter((item) => {
    const accId = item.accountId || item._id;
    if (selectedAccountId && accId !== selectedAccountId) {
      return false;
    }
    return true;
  });

  const totalDebit = filtered.reduce((acc, it) => acc + Number(it.debitOpening || it.debit || 0), 0);
  const totalCredit = filtered.reduce((acc, it) => acc + Number(it.creditOpening || it.credit || 0), 0);
  const totalBalance = filtered.reduce((acc, it) => acc + Number(it.balance || 0), 0);

  return (
    <div className="space-y-4 animate-in fade-in">
      {/* 1. Filters Bar (Page 30) */}
      <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-200">
        <form onSubmit={handleSearch} className="flex flex-wrap items-end gap-3 text-xs">
          {/* FY Selector */}
          <div className="w-48">
            <label className="block font-semibold text-gray-700 mb-1 flex items-center space-x-1">
              <Calendar className="h-3.5 w-3.5 text-gray-400" />
              <span>Financial Year</span>
            </label>
            <select
              value={selectedFYId}
              onChange={(e) => setSelectedFYId(e.target.value)}
              className="w-full rounded border border-gray-300 px-3 py-1.5 outline-none focus:border-green-500 bg-white"
            >
              <option value="">Current Financial Year</option>
              {financialYears.map((fy) => (
                <option key={fy._id} value={fy._id}>
                  {fy.name}
                </option>
              ))}
            </select>
          </div>

          {/* Account Filter */}
          <div className="flex-1 min-w-[240px]">
            <label className="block font-semibold text-gray-700 mb-1">Select Account</label>
            <select
              value={selectedAccountId}
              onChange={(e) => setSelectedAccountId(e.target.value)}
              className="w-full rounded border border-gray-300 px-3 py-1.5 outline-none focus:border-green-500 bg-white"
            >
              <option value="">-- All Accounts --</option>
              {accounts.map((acc) => (
                <option key={acc._id} value={acc._id}>
                  {acc.name}
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

      {/* 2. Header Bar (Page 30) */}
      <div className="flex items-center justify-between bg-white px-5 py-3 rounded-xl shadow-sm border border-gray-200">
        <div className="flex items-center space-x-2">
          <div className="p-2 bg-green-50 text-[#37AD47] rounded-lg">
            <BookOpen className="h-5 w-5" />
          </div>
          <div>
            <h2 className="font-extrabold text-sm sm:text-base tracking-wide text-gray-800 uppercase">
              LEDGER SUMMARY
            </h2>
            <p className="text-[11px] text-gray-400">Account Openings & Balances</p>
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

      {/* 3. Ledger Summary Table (Page 30 & 31) */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead className="bg-[#4A4A4A] text-white font-bold">
              <tr>
                <th className="py-2.5 px-3 border-r border-gray-600 w-12 text-center">SR.</th>
                <th className="py-2.5 px-3 border-r border-gray-600">Account Name</th>
                <th className="py-2.5 px-3 border-r border-gray-600">Account Details</th>
                <th className="py-2.5 px-3 border-r border-gray-600 text-right">Debit Opening</th>
                <th className="py-2.5 px-3 border-r border-gray-600 text-right">Credit Opening</th>
                <th className="py-2.5 px-3 text-right">Balance</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 text-gray-700">
              {loading ? (
                <tr>
                  <td colSpan="6" className="text-center py-10 text-gray-400">
                    Loading ledger summary...
                  </td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan="6" className="text-center py-10 text-gray-400">
                    No ledger records found.
                  </td>
                </tr>
              ) : (
                filtered.map((item, idx) => (
                  <tr key={idx} className="hover:bg-[#E9EFFF]/40 transition">
                    <td className="py-2 px-3 border-r border-gray-100 text-center font-bold text-gray-500">
                      {idx + 1}
                    </td>
                    <td className="py-2 px-3 border-r border-gray-100 font-bold text-blue-700">
                      <Link
                        to={`/reports/ledger/details?accountId=${item.accountId || item._id}`}
                        className="hover:underline flex items-center space-x-1"
                      >
                        <span>{item.accountName || item.name}</span>
                        <ExternalLink className="h-3 w-3 opacity-60" />
                      </Link>
                    </td>
                    <td className="py-2 px-3 border-r border-gray-100 text-gray-600">
                      {(() => {
                        const addr = item.address || item.accountDetails?.address || "";
                        const city = item.city || item.accountDetails?.city || "";
                        const ph = item.phone || item.mobile || item.accountDetails?.mobile || "";
                        const location = [addr, city].filter(Boolean).join(", ");
                        if (location && ph) return `${location} • Tel: ${ph}`;
                        if (location) return location;
                        if (ph) return `Tel: ${ph}`;
                        return "—";
                      })()}
                    </td>
                    <td className="py-2 px-3 border-r border-gray-100 text-right font-medium">
                      {formatCurrency(item.debitOpening || item.debit || 0)}
                    </td>
                    <td className="py-2 px-3 border-r border-gray-100 text-right font-medium">
                      {formatCurrency(item.creditOpening || item.credit || 0)}
                    </td>
                    <td className="py-2 px-3 text-right font-black text-gray-900">
                      {formatCurrency(item.balance || 0)} {item.balanceType || "Dr"}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
            {/* Total Row (Page 31) */}
            <tfoot className="border-t-2 border-gray-800 bg-gray-50 font-black text-gray-900">
              <tr>
                <td colSpan="3" className="py-2 px-3 border-r text-right uppercase">
                  TOTAL
                </td>
                <td className="py-2 px-3 border-r text-right text-gray-900">{formatCurrency(totalDebit)}</td>
                <td className="py-2 px-3 border-r text-right text-gray-900">{formatCurrency(totalCredit)}</td>
                <td className="py-2 px-3 text-right text-green-800">{formatCurrency(totalBalance)}</td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>
    </div>
  );
}
