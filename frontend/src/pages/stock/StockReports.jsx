import React, { useState, useEffect } from "react";
import { useSelector } from "react-redux";
import { Layers, Download, Search, TrendingUp, TrendingDown, Package } from "lucide-react";
import api from "../../services/api";
import { formatCurrency, formatNumber } from "../../utils/currency";

export default function StockReports({ reportType = "stock" }) {
  // 'stock' | 'details' | 'expense' | 'profit'
  const { activeCompany } = useSelector((state) => state.company);
  const [loading, setLoading] = useState(false);
  const [products, setProducts] = useState([]);
  const [search, setSearch] = useState("");

  useEffect(() => {
    fetchStockData();
  }, [activeCompany, reportType]);

  const fetchStockData = async () => {
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

  const filtered = products.filter((p) => {
    if (!search.trim()) return true;
    const term = search.toLowerCase();
    return p.name?.toLowerCase().includes(term) || p.productCode?.toLowerCase().includes(term);
  });

  const getTitle = () => {
    if (reportType === "details") return "PRODUCT DETAILS REPORT";
    if (reportType === "expense") return "PRODUCT EXPENSE REPORT";
    if (reportType === "profit") return "PRODUCT PROFIT REPORT";
    return "CURRENT STOCK INVENTORY REPORT";
  };

  return (
    <div className="space-y-4 animate-in fade-in">
      {/* Top Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-white px-5 py-3 rounded-xl shadow-sm border border-gray-200">
        <div className="flex items-center space-x-2">
          <div className="p-2 bg-emerald-50 text-[#2BC481] rounded-lg">
            <Layers className="h-5 w-5" />
          </div>
          <div>
            <h2 className="font-extrabold text-sm sm:text-base tracking-wide text-gray-800 uppercase">
              {getTitle()}
            </h2>
            <p className="text-[11px] text-gray-400">Real-Time Multi-Branch Inventory Tracking</p>
          </div>
        </div>

        <div className="flex items-center space-x-2">
          <div className="relative min-w-[200px]">
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search product..."
              className="w-full rounded border border-gray-300 pl-8 pr-3 py-1.5 text-xs outline-none focus:border-green-500"
            />
            <Search className="h-3.5 w-3.5 text-gray-400 absolute left-2.5 top-2" />
          </div>

          <button
            onClick={() => window.print()}
            className="rounded bg-gray-700 hover:bg-gray-800 text-white px-3.5 py-1.5 text-xs font-bold shadow-sm transition inline-flex items-center space-x-1"
          >
            <Download className="h-3.5 w-3.5" />
            <span>PDF</span>
          </button>
        </div>
      </div>

      {/* Table based on Report Type */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          {reportType === "stock" && (
            /* 7. Stock Report (Page 34) */
            <table className="w-full text-left text-xs border-collapse">
              <thead className="bg-[#4A4A4A] text-white font-bold">
                <tr>
                  <th className="py-2.5 px-3 border-r border-gray-600 w-12 text-center">SR.</th>
                  <th className="py-2.5 px-3 border-r border-gray-600">Product Name</th>
                  <th className="py-2.5 px-3 border-r border-gray-600">UOM</th>
                  <th className="py-2.5 px-3 border-r border-gray-600 text-right">Selling Price</th>
                  <th className="py-2.5 px-3 text-right">Available Quantity</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 text-gray-700">
                {filtered.map((p, idx) => (
                  <tr key={p._id} className="hover:bg-[#E9EFFF]/40 transition">
                    <td className="py-2 px-3 border-r border-gray-100 text-center font-bold text-gray-500">{idx + 1}</td>
                    <td className="py-2 px-3 border-r border-gray-100 font-bold text-gray-900">{p.name}</td>
                    <td className="py-2 px-3 border-r border-gray-100 text-gray-600">{p.uom}</td>
                    <td className="py-2 px-3 border-r border-gray-100 text-right font-semibold">{formatCurrency(p.sellingPrice)}</td>
                    <td className="py-2 px-3 text-right font-black text-green-700 text-sm">
                      {formatNumber(p.currentStock ?? p.openingStock ?? 0)} {p.uom}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}

          {reportType === "details" && (
            /* 8. Product Details Report (Page 34) */
            <table className="w-full text-left text-xs border-collapse">
              <thead className="bg-[#4A4A4A] text-white font-bold">
                <tr>
                  <th className="py-2.5 px-3 border-r border-gray-600 w-12 text-center">SR.</th>
                  <th className="py-2.5 px-3 border-r border-gray-600">Product Name</th>
                  <th className="py-2.5 px-3 border-r border-gray-600">Company / Supplier</th>
                  <th className="py-2.5 px-3 border-r border-gray-600 text-right">Purchase Price</th>
                  <th className="py-2.5 px-3 border-r border-gray-600 text-right">Quantity</th>
                  <th className="py-2.5 px-3">Category / Details</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 text-gray-700">
                {filtered.map((p, idx) => (
                  <tr key={p._id} className="hover:bg-[#E9EFFF]/40 transition">
                    <td className="py-2 px-3 border-r border-gray-100 text-center font-bold text-gray-500">{idx + 1}</td>
                    <td className="py-2 px-3 border-r border-gray-100 font-bold text-gray-900">{p.name}</td>
                    <td className="py-2 px-3 border-r border-gray-100 font-medium text-gray-800">{p.brand || activeCompany?.companyName || "Supplier Direct"}</td>
                    <td className="py-2 px-3 border-r border-gray-100 text-right font-semibold">{formatCurrency(p.purchasePrice)}</td>
                    <td className="py-2 px-3 border-r border-gray-100 text-right font-bold">{formatNumber(p.currentStock ?? p.openingStock ?? 0)}</td>
                    <td className="py-2 px-3 text-gray-600">{p.category || "General Goods"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}

          {reportType === "expense" && (
            /* 9. Product Expense Report (Page 34) */
            <table className="w-full text-left text-xs border-collapse">
              <thead className="bg-[#4A4A4A] text-white font-bold">
                <tr>
                  <th className="py-2.5 px-3 border-r border-gray-600 w-12 text-center">SR.</th>
                  <th className="py-2.5 px-3 border-r border-gray-600">Product Name</th>
                  <th className="py-2.5 px-3 border-r border-gray-600 text-right">Price incl. GST</th>
                  <th className="py-2.5 px-3 border-r border-gray-600 text-right">Expense per Product</th>
                  <th className="py-2.5 px-3 text-right">Overall Product Expense</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 text-gray-700">
                {filtered.map((p, idx) => {
                  const gst = Number(p.gstRate || 0);
                  const priceInclGst = Number(p.purchasePrice || 0) * (1 + gst / 100);
                  const overall = priceInclGst * Number(p.currentStock ?? p.openingStock ?? 1);
                  return (
                    <tr key={p._id} className="hover:bg-[#E9EFFF]/40 transition">
                      <td className="py-2 px-3 border-r border-gray-100 text-center font-bold text-gray-500">{idx + 1}</td>
                      <td className="py-2 px-3 border-r border-gray-100 font-bold text-gray-900">{p.name}</td>
                      <td className="py-2 px-3 border-r border-gray-100 text-right font-medium">{formatCurrency(priceInclGst)}</td>
                      <td className="py-2 px-3 border-r border-gray-100 text-right font-semibold text-amber-700">{formatCurrency(priceInclGst)}</td>
                      <td className="py-2 px-3 text-right font-black text-gray-900">{formatCurrency(overall)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}

          {reportType === "profit" && (
            /* 10. Product Profit Report (Page 34 & 35) */
            <table className="w-full text-left text-xs border-collapse">
              <thead className="bg-[#4A4A4A] text-white font-bold">
                <tr>
                  <th className="py-2.5 px-3 border-r border-gray-600 w-12 text-center">SR.</th>
                  <th className="py-2.5 px-3 border-r border-gray-600">Product Name</th>
                  <th className="py-2.5 px-3 border-r border-gray-600 text-right">Selling Amount</th>
                  <th className="py-2.5 px-3 border-r border-gray-600 text-right">Expense / Cost (incl. GST)</th>
                  <th className="py-2.5 px-3 border-r border-gray-600 text-right">Profit per Product</th>
                  <th className="py-2.5 px-3 text-right">Overall Profit</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 text-gray-700">
                {filtered.map((p, idx) => {
                  const gst = Number(p.gstRate || 0);
                  const cost = Number(p.purchasePrice || 0) * (1 + gst / 100);
                  const sell = Number(p.sellingPrice || 0);
                  const profitUnit = sell - cost;
                  const overall = profitUnit * Number(p.currentStock ?? p.openingStock ?? 1);
                  return (
                    <tr key={p._id} className="hover:bg-[#E9EFFF]/40 transition">
                      <td className="py-2 px-3 border-r border-gray-100 text-center font-bold text-gray-500">{idx + 1}</td>
                      <td className="py-2 px-3 border-r border-gray-100 font-bold text-gray-900">{p.name}</td>
                      <td className="py-2 px-3 border-r border-gray-100 text-right font-semibold">{formatCurrency(sell)}</td>
                      <td className="py-2 px-3 border-r border-gray-100 text-right text-gray-600">{formatCurrency(cost)}</td>
                      <td className={`py-2 px-3 border-r border-gray-100 text-right font-bold ${profitUnit >= 0 ? "text-green-700" : "text-red-600"}`}>
                        {formatCurrency(profitUnit)}
                      </td>
                      <td className={`py-2 px-3 text-right font-black ${overall >= 0 ? "text-green-700" : "text-red-600"}`}>
                        {formatCurrency(overall)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}
