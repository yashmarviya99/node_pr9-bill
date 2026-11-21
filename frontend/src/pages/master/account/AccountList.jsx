import React, { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useSelector } from "react-redux";
import {
  Plus,
  FileText,
  Search,
  Edit2,
  Trash2,
  Download,
  AlertTriangle,
  Users,
  CheckCircle,
} from "lucide-react";
import api from "../../../services/api";
import toast from "react-hot-toast";

export default function AccountList({ filterType, pageTitle = "ACCOUNT LIST" }) {
  const navigate = useNavigate();
  const { activeCompany } = useSelector((state) => state.company);

  const [loading, setLoading] = useState(false);
  const [accounts, setAccounts] = useState([]);
  const [selectedAccountId, setSelectedAccountId] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [deleteModalAcc, setDeleteModalAcc] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 50;

  useEffect(() => {
    fetchAccounts();
  }, [activeCompany, filterType]);

  const fetchAccounts = async () => {
    try {
      setLoading(true);
      const params = {};
      if (filterType) {
        params.accountType = filterType;
      }
      const res = await api.get("/accounts", { params });
      if (res.data?.success) {
        setAccounts(res.data.accounts || []);
      }
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (e) => {
    e?.preventDefault();
    // filtered accounts by dropdown or search term
  };

  const filteredAccounts = accounts.filter((acc) => {
    if (selectedAccountId && acc._id !== selectedAccountId) {
      return false;
    }
    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase();
      const matchName = acc.name?.toLowerCase().includes(term);
      const matchGst = acc.gstNumber?.toLowerCase().includes(term);
      const matchPhone = acc.phone?.toLowerCase().includes(term);
      const matchContact = acc.contactPerson?.toLowerCase().includes(term);
      if (!matchName && !matchGst && !matchPhone && !matchContact) {
        return false;
      }
    }
    return true;
  });

  const totalPages = Math.ceil(filteredAccounts.length / itemsPerPage) || 1;
  const paginatedAccounts = filteredAccounts.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  const handleDelete = async () => {
    if (!deleteModalAcc) return;
    try {
      await api.delete(`/accounts/${deleteModalAcc._id}`);
      toast.success("Account deleted successfully");
      setDeleteModalAcc(null);
      fetchAccounts();
    } catch (err) {
      toast.error(err.message || "Failed to delete account");
    }
  };

  const handlePrintPDF = () => {
    window.print();
  };

  // Determine entry route
  let entryRoute = "/master/account/create";
  if (filterType === "customer") entryRoute = "/master/customer/create";
  if (filterType === "supplier") entryRoute = "/master/supplier/create";

  return (
    <div className="space-y-4 animate-in fade-in">
      {/* 1. Filter / Account Search Bar (Page 11) */}
      <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-200">
        <form onSubmit={handleSearch} className="flex flex-wrap items-end gap-3">
          <div className="flex-1 min-w-[240px]">
            <label className="block text-xs font-bold text-gray-700 mb-1">
              Select {filterType === "customer" ? "Customer" : filterType === "supplier" ? "Supplier" : "Account"}
            </label>
            <select
              value={selectedAccountId}
              onChange={(e) => setSelectedAccountId(e.target.value)}
              className="w-full rounded border border-gray-300 px-3 py-1.5 text-xs outline-none focus:border-green-500 bg-white"
            >
              <option value="">-- All Accounts --</option>
              {accounts.map((acc) => (
                <option key={acc._id} value={acc._id}>
                  {acc.name} {acc.gstNumber ? `(${acc.gstNumber})` : ""}
                </option>
              ))}
            </select>
          </div>

          <div className="flex-1 min-w-[200px]">
            <label className="block text-xs font-bold text-gray-700 mb-1">Search Keywords</label>
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search by name, GSTIN, mobile..."
              className="w-full rounded border border-gray-300 px-3 py-1.5 text-xs outline-none focus:border-green-500"
            />
          </div>

          <button
            type="submit"
            className="rounded bg-[#37AD47] hover:bg-[#2f963e] text-white px-5 py-1.5 text-xs font-bold shadow transition inline-flex items-center space-x-1 h-[33px]"
          >
            <Search className="h-3.5 w-3.5" />
            <span>SEARCH</span>
          </button>

          {(selectedAccountId || searchTerm) && (
            <button
              type="button"
              onClick={() => {
                setSelectedAccountId("");
                setSearchTerm("");
              }}
              className="rounded bg-gray-100 hover:bg-gray-200 text-gray-600 px-3 py-1.5 text-xs font-semibold h-[33px]"
            >
              Clear
            </button>
          )}
        </form>
      </div>

      {/* 2. Top Header & Action Buttons */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-white px-5 py-3 rounded-xl shadow-sm border border-gray-200">
        <div className="flex items-center space-x-2">
          <div className="p-2 bg-emerald-50 text-[#2BC481] rounded-lg">
            <Users className="h-5 w-5" />
          </div>
          <div>
            <h2 className="font-extrabold text-sm sm:text-base tracking-wide text-gray-800 uppercase">
              {pageTitle}
            </h2>
            <p className="text-[11px] text-gray-400">
              Total: {filteredAccounts.length} records • Page {currentPage} of {totalPages}
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-2">
          <button
            onClick={handlePrintPDF}
            className="rounded bg-gray-700 hover:bg-gray-800 text-white px-3.5 py-1.5 text-xs font-bold shadow-sm transition inline-flex items-center space-x-1"
          >
            <Download className="h-3.5 w-3.5" />
            <span>PDF</span>
          </button>

          <Link
            to={entryRoute}
            className="rounded bg-[#37AD47] hover:bg-[#2f963e] text-white px-4 py-1.5 text-xs font-bold shadow transition inline-flex items-center space-x-1"
          >
            <Plus className="h-3.5 w-3.5" />
            <span>+ ACCOUNT ENTRY</span>
          </Link>
        </div>
      </div>

      {/* 3. Account List Table (Page 12) */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead className="bg-[#4A4A4A] text-white font-bold">
              <tr>
                <th className="py-2.5 px-3 border-r border-gray-600 w-12 text-center">SR. NO.</th>
                <th className="py-2.5 px-3 border-r border-gray-600">Account Name</th>
                <th className="py-2.5 px-3 border-r border-gray-600">GSTIN</th>
                <th className="py-2.5 px-3 border-r border-gray-600">Country</th>
                <th className="py-2.5 px-3 border-r border-gray-600">State</th>
                <th className="py-2.5 px-3 border-r border-gray-600">Account Group</th>
                <th className="py-2.5 px-3 border-r border-gray-600">Contact Person</th>
                <th className="py-2.5 px-3 border-r border-gray-600">Mobile no.</th>
                <th className="py-2.5 px-3 text-center w-24">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 text-gray-700">
              {loading ? (
                <tr>
                  <td colSpan="9" className="text-center py-10 text-gray-400">
                    Loading accounts...
                  </td>
                </tr>
              ) : paginatedAccounts.length === 0 ? (
                <tr>
                  <td colSpan="9" className="text-center py-10 text-gray-400">
                    No matching accounts found.
                  </td>
                </tr>
              ) : (
                paginatedAccounts.map((acc, idx) => (
                  <tr key={acc._id} className="hover:bg-[#E9EFFF]/40 transition">
                    <td className="py-2 px-3 border-r border-gray-100 text-center font-semibold text-gray-500">
                      {(currentPage - 1) * itemsPerPage + idx + 1}
                    </td>
                    <td className="py-2 px-3 border-r border-gray-100 font-bold text-gray-900">
                      <Link
                        to={`/reports/ledger/details?accountId=${acc._id}`}
                        className="hover:text-green-700 hover:underline"
                      >
                        {acc.name}
                      </Link>
                    </td>
                    <td className="py-2 px-3 border-r border-gray-100 font-mono text-[11px] text-gray-600">
                      {acc.gstNumber || "—"}
                    </td>
                    <td className="py-2 px-3 border-r border-gray-100 text-gray-600">
                      {acc.country || "India"}
                    </td>
                    <td className="py-2 px-3 border-r border-gray-100 text-gray-600">
                      {acc.state || "Gujarat"}
                    </td>
                    <td className="py-2 px-3 border-r border-gray-100">
                      <span className="inline-block rounded bg-gray-100 px-2 py-0.5 text-[11px] font-semibold text-gray-800 capitalize">
                        {acc.accountType}
                      </span>
                    </td>
                    <td className="py-2 px-3 border-r border-gray-100 text-gray-600">
                      {acc.contactPerson || "—"}
                    </td>
                    <td className="py-2 px-3 border-r border-gray-100 font-medium text-gray-700">
                      {acc.phone || "—"}
                    </td>
                    <td className="py-2 px-3 text-center">
                      <div className="flex items-center justify-center space-x-1.5">
                        <Link
                          to={`/master/account/edit/${acc._id}`}
                          className="rounded p-1 text-blue-600 hover:bg-blue-50 transition"
                          title="Edit Account"
                        >
                          <Edit2 className="h-3.5 w-3.5" />
                        </Link>
                        <button
                          onClick={() => setDeleteModalAcc(acc)}
                          className="rounded p-1 text-red-600 hover:bg-red-50 transition"
                          title="Delete Account"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* 5. Pagination Controls (Page 12) */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between border-t border-gray-200 px-4 py-3 text-xs bg-gray-50">
            <span className="text-gray-500">
              Showing {(currentPage - 1) * itemsPerPage + 1} to{" "}
              {Math.min(currentPage * itemsPerPage, filteredAccounts.length)} of {filteredAccounts.length} entries
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

      {/* Delete Confirmation Modal (Page 12) */}
      {deleteModalAcc && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md rounded-xl bg-white shadow-2xl overflow-hidden p-6 text-gray-800 animate-in fade-in">
            <div className="flex items-center space-x-3 text-red-600 mb-3">
              <AlertTriangle className="h-6 w-6" />
              <h3 className="font-bold text-base">Delete Account Confirmation</h3>
            </div>
            <p className="text-xs text-gray-600 leading-relaxed">
              Are you sure you want to delete the account for{" "}
              <strong className="text-gray-900">{deleteModalAcc.name}</strong>? This action cannot be undone.
            </p>
            <div className="mt-5 flex justify-end space-x-2">
              <button
                type="button"
                onClick={() => setDeleteModalAcc(null)}
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
    </div>
  );
}
