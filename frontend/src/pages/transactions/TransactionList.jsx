import React, { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useSelector } from "react-redux";
import {
  FileText,
  Search,
  Plus,
  Download,
  Printer,
  Eye,
  FileCheck,
  DollarSign,
  Edit2,
  Trash2,
  AlertTriangle,
  AlertCircle,
  Calendar,
} from "lucide-react";
import api from "../../services/api";
import { isDateInFinancialYear, formatISODate, formatDate } from "../../utils/date";
import { formatCurrency, formatNumber } from "../../utils/currency";
import InvoicePreviewModal from "../../components/invoice/InvoicePreviewModal";
import PaymentModal from "../../components/common/PaymentModal";
import toast from "react-hot-toast";

export default function TransactionList({ transactionType = "sale" }) {
  // 'sale' | 'purchase' | 'sale_return' | 'purchase_return' | 'challan' | 'quotation'
  const navigate = useNavigate();
  const { activeCompany } = useSelector((state) => state.company);
  const { activeFinancialYear } = useSelector((state) => state.financialYear);

  const isSale = transactionType === "sale";
  const isPurchase = transactionType === "purchase";
  const isSaleReturn = transactionType === "sale_return";
  const isPurchaseReturn = transactionType === "purchase_return";
  const isChallan = transactionType === "challan";
  const isQuotation = transactionType === "quotation";

  const [loading, setLoading] = useState(false);
  const [records, setRecords] = useState([]);
  const [fromDate, setFromDate] = useState(formatISODate(new Date()));
  const [toDate, setToDate] = useState(formatISODate(new Date()));
  const [searchTerm, setSearchTerm] = useState("");
  const [dateError, setDateError] = useState("");

  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 50;

  // Modals state
  const [previewInvoice, setPreviewInvoice] = useState(null);
  const [paymentTransaction, setPaymentTransaction] = useState(null);
  const [deleteTransaction, setDeleteTransaction] = useState(null);

  useEffect(() => {
    fetchRecords();
  }, [activeCompany, transactionType]);

  const getEndpoint = () => {
    if (isSale) return "/sales";
    if (isPurchase) return "/purchases";
    if (isSaleReturn) return "/sale-returns";
    if (isPurchaseReturn) return "/purchase-returns";
    if (isChallan) return "/challans";
    return "/quotations";
  };

  const validateDates = (start, end) => {
    if (new Date(start) > new Date(end)) {
      setDateError("From Date must be earlier than or equal to To Date.");
      return false;
    }
    if (
      !isDateInFinancialYear(start, activeFinancialYear) ||
      !isDateInFinancialYear(end, activeFinancialYear)
    ) {
      setDateError("Change the Financial Year");
      return false;
    }
    setDateError("");
    return true;
  };

  const fetchRecords = async () => {
    try {
      setLoading(true);
      const res = await api.get(getEndpoint(), {
        params: {
          fromDate,
          toDate,
          limit: 100,
        },
      });

      if (res.data?.success) {
        let list = [];
        if (isSale) list = res.data.sales || [];
        else if (isPurchase) list = res.data.purchases || [];
        else if (isSaleReturn) list = res.data.saleReturns || [];
        else if (isPurchaseReturn) list = res.data.purchaseReturns || [];
        else if (isChallan) list = res.data.challans || [];
        else if (isQuotation) list = res.data.quotations || [];
        setRecords(list);
      }
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  };

  const handleFilterSearch = (e) => {
    e.preventDefault();
    if (validateDates(fromDate, toDate)) {
      fetchRecords();
    }
  };

  const handleDelete = async () => {
    if (!deleteTransaction) return;
    try {
      await api.delete(`${getEndpoint()}/${deleteTransaction._id}`);
      toast.success("Transaction deleted successfully");
      setDeleteTransaction(null);
      fetchRecords();
    } catch (err) {
      toast.error(err.message || "Failed to delete transaction");
    }
  };

  const filteredRecords = records.filter((rec) => {
    if (!searchTerm.trim()) return true;
    const term = searchTerm.toLowerCase();
    const invNo = (rec.invoiceNumber || rec.challanNumber || rec.quotationNumber || "").toLowerCase();
    const party = (rec.account?.name || rec.customer?.name || rec.supplier?.name || "").toLowerCase();
    const date = formatDate(rec.invoiceDate || rec.challanDate || rec.quotationDate).toLowerCase();
    return invNo.includes(term) || party.includes(term) || date.includes(term);
  });

  const totalPages = Math.ceil(filteredRecords.length / itemsPerPage) || 1;
  const paginatedRecords = filteredRecords.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  const titleText = isSale
    ? "SALE LIST"
    : isPurchase
    ? "PURCHASE LIST"
    : isSaleReturn
    ? "SALE RETURN LIST"
    : isPurchaseReturn
    ? "PURCHASE RETURN LIST"
    : isChallan
    ? "CHALLAN LIST"
    : "QUOTATION LIST";

  const entryRoute = isSale
    ? "/transactions/sale-entry"
    : isPurchase
    ? "/transactions/purchase-entry"
    : isSaleReturn
    ? "/transactions/sale-return"
    : isPurchaseReturn
    ? "/transactions/purchase-return"
    : isChallan
    ? "/transactions/challan"
    : "/transactions/quotation";

  return (
    <div className="space-y-4 animate-in fade-in">
      {/* 1. Date Filter Section (Page 19) */}
      <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-200">
        <form onSubmit={handleFilterSearch} className="flex flex-wrap items-end gap-3 text-xs">
          <div className="w-40">
            <label className="block font-semibold text-gray-700 mb-1">From Date</label>
            <input
              type="date"
              value={fromDate}
              onChange={(e) => {
                setFromDate(e.target.value);
                validateDates(e.target.value, toDate);
              }}
              className="w-full rounded border border-gray-300 px-3 py-1.5 outline-none focus:border-green-500"
            />
          </div>

          <div className="w-40">
            <label className="block font-semibold text-gray-700 mb-1">To Date</label>
            <input
              type="date"
              value={toDate}
              onChange={(e) => {
                setToDate(e.target.value);
                validateDates(fromDate, e.target.value);
              }}
              className="w-full rounded border border-gray-300 px-3 py-1.5 outline-none focus:border-green-500"
            />
          </div>

          <button
            type="submit"
            className="rounded bg-[#37AD47] hover:bg-[#2f963e] text-white px-5 py-1.5 font-bold shadow transition inline-flex items-center space-x-1 h-[32px]"
          >
            <Search className="h-3.5 w-3.5" />
            <span>SEARCH</span>
          </button>
        </form>

        {dateError && (
          <div className="mt-2 text-red-600 font-bold text-xs flex items-center space-x-1">
            <AlertCircle className="h-4 w-4" />
            <span>{dateError}</span>
          </div>
        )}
      </div>

      {/* 2. List Header & Actions (Page 20) */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-white px-5 py-3 rounded-xl shadow-sm border border-gray-200">
        <div className="flex items-center space-x-2">
          <div className="p-2 bg-green-50 text-[#37AD47] rounded-lg">
            <FileText className="h-5 w-5" />
          </div>
          <div>
            <h2 className="font-extrabold text-sm sm:text-base tracking-wide text-gray-800 uppercase">
              {titleText}
            </h2>
            <p className="text-[11px] text-gray-400">
              Showing records for period {formatDate(fromDate)} to {formatDate(toDate)}
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-2">
          {/* Search Box on right */}
          <div className="relative min-w-[200px]">
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search by Invoice, Party..."
              className="w-full rounded border border-gray-300 pl-8 pr-3 py-1.5 text-xs outline-none focus:border-green-500"
            />
            <Search className="h-3.5 w-3.5 text-gray-400 absolute left-2.5 top-2" />
          </div>

          {/* PDF Button */}
          <button
            onClick={() => window.print()}
            className="rounded bg-gray-700 hover:bg-gray-800 text-white px-3.5 py-1.5 text-xs font-bold shadow-sm transition inline-flex items-center space-x-1"
          >
            <Download className="h-3.5 w-3.5" />
            <span>PDF</span>
          </button>

          {/* + Transaction Entry Button */}
          <Link
            to={entryRoute}
            className="rounded bg-[#37AD47] hover:bg-[#2f963e] text-white px-4 py-1.5 text-xs font-bold shadow transition inline-flex items-center space-x-1"
          >
            <Plus className="h-3.5 w-3.5" />
            <span>+ {isSale ? "SALE" : isPurchase ? "PURCHASE" : isSaleReturn ? "SALE RETURN" : isPurchaseReturn ? "PURCHASE RETURN" : isChallan ? "CHALLAN" : "QUOTATION"} ENTRY</span>
          </Link>
        </div>
      </div>

      {/* 3. Sale Records Table (Page 20) */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead className="bg-[#4A4A4A] text-white font-bold">
              <tr>
                <th className="py-2.5 px-3 border-r border-gray-600 w-12 text-center">SR. NO.</th>
                <th className="py-2.5 px-3 border-r border-gray-600">Invoice No.</th>
                <th className="py-2.5 px-3 border-r border-gray-600">Invoice Date</th>
                <th className="py-2.5 px-3 border-r border-gray-600">Account Name</th>
                <th className="py-2.5 px-3 border-r border-gray-600 text-center">Total Qty</th>
                <th className="py-2.5 px-3 border-r border-gray-600 text-right">Total Amount</th>
                <th className="py-2.5 px-3 border-r border-gray-600 text-right">Paid</th>
                <th className="py-2.5 px-3 border-r border-gray-600 text-right">Received</th>
                <th className="py-2.5 px-3 border-r border-gray-600 text-right">Remaining</th>
                <th className="py-2.5 px-3 border-r border-gray-600 text-center w-24">Printing</th>
                {!isChallan && !isQuotation && (
                  <th className="py-2.5 px-3 border-r border-gray-600 text-center w-14">Payment</th>
                )}
                <th className="py-2.5 px-3 text-center w-20">Edit / Delete</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 text-gray-700">
              {loading ? (
                <tr>
                  <td colSpan="12" className="text-center py-10 text-gray-400">
                    Loading records...
                  </td>
                </tr>
              ) : paginatedRecords.length === 0 ? (
                <tr>
                  <td colSpan="12" className="text-center py-10 text-gray-400">
                    No transactions found for the selected dates.
                  </td>
                </tr>
              ) : (
                paginatedRecords.map((rec, idx) => {
                  const paid = rec.paidAmount || (isPurchase ? rec.paymentAmount || 0 : 0);
                  const received = isSale ? rec.paymentAmount || rec.paidAmount || 0 : 0;
                  const total = rec.totalAmount || 0;
                  const remaining = rec.remainingAmount ?? Math.max(0, total - (isSale ? received : paid));
                  const partyName = rec.account?.name || rec.customer?.name || rec.supplier?.name || "Party";
                  const totalQty = (rec.items || []).reduce((s, i) => s + Number(i.quantity || 0), 0);

                  return (
                    <tr key={rec._id} className="hover:bg-[#E9EFFF]/40 transition">
                      <td className="py-2 px-3 border-r border-gray-100 text-center font-semibold text-gray-500">
                        {(currentPage - 1) * itemsPerPage + idx + 1}
                      </td>
                      <td className="py-2 px-3 border-r border-gray-100 font-bold text-gray-900">
                        {rec.invoiceNumber || rec.challanNumber || rec.quotationNumber}
                      </td>
                      <td className="py-2 px-3 border-r border-gray-100 text-gray-600">
                        {formatDate(rec.invoiceDate || rec.challanDate || rec.quotationDate)}
                      </td>
                      <td className="py-2 px-3 border-r border-gray-100 font-semibold text-gray-800">
                        {partyName}
                      </td>
                      <td className="py-2 px-3 border-r border-gray-100 text-center font-semibold text-gray-700">
                        {formatNumber(totalQty, 0)}
                      </td>
                      <td className="py-2 px-3 border-r border-gray-100 text-right font-black text-gray-900">
                        {formatCurrency(total)}
                      </td>
                      <td className="py-2 px-3 border-r border-gray-100 text-right text-gray-600">
                        {formatCurrency(paid)}
                      </td>
                      <td className="py-2 px-3 border-r border-gray-100 text-right font-bold text-green-700">
                        {formatCurrency(received)}
                      </td>
                      <td className="py-2 px-3 border-r border-gray-100 text-right font-bold text-red-600">
                        {formatCurrency(remaining)}
                      </td>

                      {/* Printing Icons: Print, Eye (Preview), Challan */}
                      <td className="py-2 px-2 border-r border-gray-100 text-center">
                        <div className="flex items-center justify-center space-x-1">
                          <button
                            onClick={() => {
                              setPreviewInvoice(rec);
                              setTimeout(() => window.print(), 300);
                            }}
                            className="p-1 rounded text-gray-700 hover:bg-gray-100"
                            title="Print PDF"
                          >
                            <Printer className="h-3.5 w-3.5" />
                          </button>
                          <button
                            onClick={() => setPreviewInvoice(rec)}
                            className="p-1 rounded text-blue-600 hover:bg-blue-50"
                            title="Preview PDF"
                          >
                            <Eye className="h-3.5 w-3.5" />
                          </button>
                          <button
                            onClick={() => {
                              toast.success("Delivery Challan ready");
                              setPreviewInvoice({ ...rec, invoiceType: "Challan" });
                            }}
                            className="p-1 rounded text-purple-600 hover:bg-purple-50"
                            title="Challan PDF"
                          >
                            <FileCheck className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </td>

                      {/* Payment Modal ₹ Icon */}
                      {!isChallan && !isQuotation && (
                        <td className="py-2 px-2 border-r border-gray-100 text-center">
                          <button
                            onClick={() => setPaymentTransaction({ ...rec, remaining })}
                            className="rounded-full bg-green-50 hover:bg-green-100 text-[#37AD47] p-1 font-bold text-xs"
                            title="Record Payment"
                          >
                            ₹
                          </button>
                        </td>
                      )}

                      {/* Edit / Delete */}
                      <td className="py-2 px-3 text-center">
                        <div className="flex items-center justify-center space-x-1.5">
                          <Link
                            to={`${entryRoute}?edit=${rec._id}`}
                            className="p-1 text-blue-600 hover:bg-blue-50 rounded"
                            title="Edit"
                          >
                            <Edit2 className="h-3.5 w-3.5" />
                          </Link>
                          <button
                            onClick={() => setDeleteTransaction(rec)}
                            className="p-1 text-red-600 hover:bg-red-50 rounded"
                            title="Delete"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Controls */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between border-t border-gray-200 px-4 py-3 text-xs bg-gray-50">
            <span className="text-gray-500">
              Showing {(currentPage - 1) * itemsPerPage + 1} to{" "}
              {Math.min(currentPage * itemsPerPage, filteredRecords.length)} of {filteredRecords.length} entries
            </span>
            <div className="flex items-center space-x-1">
              <button
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="rounded border border-gray-300 bg-white px-2.5 py-1 text-gray-600 hover:bg-gray-100 disabled:opacity-40"
              >
                Previous
              </button>
              {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
                <button
                  key={p}
                  onClick={() => setCurrentPage(p)}
                  className={`rounded px-2.5 py-1 font-semibold ${
                    currentPage === p ? "bg-[#37AD47] text-white" : "border border-gray-300 bg-white text-gray-700 hover:bg-gray-100"
                  }`}
                >
                  {p}
                </button>
              ))}
              <button
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
                className="rounded border border-gray-300 bg-white px-2.5 py-1 text-gray-600 hover:bg-gray-100 disabled:opacity-40"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Delete Confirmation Modal (Page 20) */}
      {deleteTransaction && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md rounded-xl bg-white shadow-2xl overflow-hidden p-6 text-gray-800 animate-in fade-in">
            <div className="flex items-center space-x-3 text-red-600 mb-3">
              <AlertTriangle className="h-6 w-6" />
              <h3 className="font-bold text-base">Delete Invoice Confirmation</h3>
            </div>
            <p className="text-xs text-gray-600 leading-relaxed">
              Are you sure you want to delete this {transactionType} invoice{" "}
              <strong className="text-gray-900">{deleteTransaction.invoiceNumber}</strong>? This action cannot be undone.
            </p>
            <div className="mt-5 flex justify-end space-x-2">
              <button
                type="button"
                onClick={() => setDeleteTransaction(null)}
                className="rounded px-4 py-1.5 text-xs font-semibold text-gray-600 hover:bg-gray-100"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDelete}
                className="rounded bg-[#DF6B6B] hover:bg-[#cf5b5b] text-white px-5 py-1.5 text-xs font-bold shadow"
              >
                Yes, Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Invoice PDF Preview Modal */}
      {previewInvoice && (
        <InvoicePreviewModal
          isOpen={Boolean(previewInvoice)}
          onClose={() => setPreviewInvoice(null)}
          invoice={previewInvoice}
          company={activeCompany}
        />
      )}

      {/* Payment Recording Modal */}
      {paymentTransaction && (
        <PaymentModal
          isOpen={Boolean(paymentTransaction)}
          onClose={() => setPaymentTransaction(null)}
          transaction={paymentTransaction}
          onSuccess={fetchRecords}
        />
      )}
    </div>
  );
}
