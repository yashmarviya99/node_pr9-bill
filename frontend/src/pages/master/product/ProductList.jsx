import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { useSelector } from "react-redux";
import { Plus, Package, Search, Edit2, Trash2, Download, AlertTriangle } from "lucide-react";
import api from "../../../services/api";
import { formatCurrency, formatNumber } from "../../../utils/currency";
import toast from "react-hot-toast";

export default function ProductList() {
  const { activeCompany } = useSelector((state) => state.company);

  const [loading, setLoading] = useState(false);
  const [products, setProducts] = useState([]);
  const [search, setSearch] = useState("");
  const [deleteModalProd, setDeleteModalProd] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 50;

  useEffect(() => {
    fetchProducts();
  }, [activeCompany]);

  const fetchProducts = async () => {
    try {
      setLoading(true);
      const res = await api.get("/products");
      if (res.data?.success) {
        setProducts(res.data.products || []);
      }
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  };

  const filteredProducts = products.filter((p) => {
    if (!search.trim()) return true;
    const term = search.toLowerCase();
    return (
      p.name?.toLowerCase().includes(term) ||
      p.productCode?.toLowerCase().includes(term) ||
      p.hsnSac?.toLowerCase().includes(term) ||
      p.category?.toLowerCase().includes(term)
    );
  });

  const totalPages = Math.ceil(filteredProducts.length / itemsPerPage) || 1;
  const paginatedProducts = filteredProducts.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  const handleDelete = async () => {
    if (!deleteModalProd) return;
    try {
      await api.delete(`/products/${deleteModalProd._id}`);
      toast.success("Product deleted successfully");
      setDeleteModalProd(null);
      fetchProducts();
    } catch (err) {
      toast.error(err.message || "Failed to delete product");
    }
  };

  return (
    <div className="space-y-4 animate-in fade-in">
      {/* Top Search Bar */}
      <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-200 flex flex-wrap items-center justify-between gap-3">
        <div className="flex-1 min-w-[260px] relative">
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search products by name, code, HSN, category..."
            className="w-full rounded border border-gray-300 pl-8 pr-3 py-1.5 text-xs outline-none focus:border-green-500"
          />
          <Search className="h-4 w-4 text-gray-400 absolute left-2.5 top-2" />
        </div>

        <div className="flex items-center space-x-2">
          <button
            onClick={() => window.print()}
            className="rounded bg-gray-700 hover:bg-gray-800 text-white px-3.5 py-1.5 text-xs font-bold shadow-sm transition inline-flex items-center space-x-1"
          >
            <Download className="h-3.5 w-3.5" />
            <span>PDF</span>
          </button>
          <Link
            to="/master/product/create"
            className="rounded bg-[#37AD47] hover:bg-[#2f963e] text-white px-4 py-1.5 text-xs font-bold shadow transition inline-flex items-center space-x-1"
          >
            <Plus className="h-3.5 w-3.5" />
            <span>+ PRODUCT ENTRY</span>
          </Link>
        </div>
      </div>

      {/* Header */}
      <div className="flex items-center justify-between bg-white px-5 py-3 rounded-xl shadow-sm border border-gray-200">
        <div className="flex items-center space-x-2">
          <div className="p-2 bg-emerald-50 text-[#2BC481] rounded-lg">
            <Package className="h-5 w-5" />
          </div>
          <div>
            <h2 className="font-extrabold text-sm sm:text-base tracking-wide text-gray-800 uppercase">
              PRODUCT MASTER LIST
            </h2>
            <p className="text-[11px] text-gray-400">
              Total {filteredProducts.length} Items • Page {currentPage} of {totalPages}
            </p>
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead className="bg-[#4A4A4A] text-white font-bold">
              <tr>
                <th className="py-2.5 px-3 border-r border-gray-600 w-12 text-center">SR.</th>
                <th className="py-2.5 px-3 border-r border-gray-600">Product / Service Name</th>
                <th className="py-2.5 px-3 border-r border-gray-600">Code</th>
                <th className="py-2.5 px-3 border-r border-gray-600">HSN/SAC</th>
                <th className="py-2.5 px-3 border-r border-gray-600">UOM</th>
                <th className="py-2.5 px-3 border-r border-gray-600 text-center">GST %</th>
                <th className="py-2.5 px-3 border-r border-gray-600 text-right">Buying Price</th>
                <th className="py-2.5 px-3 border-r border-gray-600 text-right">Selling Price</th>
                <th className="py-2.5 px-3 border-r border-gray-600 text-right">Stock Qty</th>
                <th className="py-2.5 px-3 text-center w-20">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 text-gray-700">
              {loading ? (
                <tr>
                  <td colSpan="10" className="text-center py-10 text-gray-400">
                    Loading products...
                  </td>
                </tr>
              ) : paginatedProducts.length === 0 ? (
                <tr>
                  <td colSpan="10" className="text-center py-10 text-gray-400">
                    No products added yet.
                  </td>
                </tr>
              ) : (
                paginatedProducts.map((p, idx) => (
                  <tr key={p._id} className="hover:bg-[#E9EFFF]/40 transition">
                    <td className="py-2 px-3 border-r border-gray-100 text-center font-semibold text-gray-500">
                      {(currentPage - 1) * itemsPerPage + idx + 1}
                    </td>
                    <td className="py-2 px-3 border-r border-gray-100 font-bold text-gray-900">
                      {p.name}
                    </td>
                    <td className="py-2 px-3 border-r border-gray-100 font-mono text-gray-600">
                      {p.productCode || "—"}
                    </td>
                    <td className="py-2 px-3 border-r border-gray-100 font-mono text-gray-600">
                      {p.hsnSac || "—"}
                    </td>
                    <td className="py-2 px-3 border-r border-gray-100 text-gray-600">
                      {p.uom}
                    </td>
                    <td className="py-2 px-3 border-r border-gray-100 text-center font-bold text-gray-700">
                      {p.gstRate}%
                    </td>
                    <td className="py-2 px-3 border-r border-gray-100 text-right text-gray-600">
                      {formatCurrency(p.purchasePrice)}
                    </td>
                    <td className="py-2 px-3 border-r border-gray-100 text-right font-bold text-green-700">
                      {formatCurrency(p.sellingPrice)}
                    </td>
                    <td className="py-2 px-3 border-r border-gray-100 text-right font-bold text-gray-900">
                      {formatNumber(p.currentStock ?? p.openingStock)}
                    </td>
                    <td className="py-2 px-3 text-center">
                      <div className="flex items-center justify-center space-x-1.5">
                        <Link
                          to={`/master/product/edit/${p._id}`}
                          className="rounded p-1 text-blue-600 hover:bg-blue-50 transition"
                          title="Edit Product"
                        >
                          <Edit2 className="h-3.5 w-3.5" />
                        </Link>
                        <button
                          onClick={() => setDeleteModalProd(p)}
                          className="rounded p-1 text-red-600 hover:bg-red-50 transition"
                          title="Delete Product"
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

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between border-t border-gray-200 px-4 py-3 text-xs bg-gray-50">
            <span className="text-gray-500">
              Showing {(currentPage - 1) * itemsPerPage + 1} to{" "}
              {Math.min(currentPage * itemsPerPage, filteredProducts.length)} of {filteredProducts.length} entries
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

      {/* Delete Confirmation Modal */}
      {deleteModalProd && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md rounded-xl bg-white shadow-2xl overflow-hidden p-6 text-gray-800 animate-in fade-in">
            <div className="flex items-center space-x-3 text-red-600 mb-3">
              <AlertTriangle className="h-6 w-6" />
              <h3 className="font-bold text-base">Delete Product Confirmation</h3>
            </div>
            <p className="text-xs text-gray-600 leading-relaxed">
              Are you sure you want to delete the product <strong className="text-gray-900">{deleteModalProd.name}</strong>? This action cannot be undone.
            </p>
            <div className="mt-5 flex justify-end space-x-2">
              <button
                type="button"
                onClick={() => setDeleteModalProd(null)}
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
