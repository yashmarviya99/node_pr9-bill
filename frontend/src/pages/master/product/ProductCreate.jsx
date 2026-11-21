import React, { useState, useEffect } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { useSelector } from "react-redux";
import { Box, Save, List, Package } from "lucide-react";
import api from "../../../services/api";
import toast from "react-hot-toast";

const UOM_OPTIONS = [
  "Piece (PCS)",
  "Kilogram (KG)",
  "Gram (G)",
  "Ton",
  "Liter (L)",
  "Milliliter (ML)",
  "Meter (M)",
  "Centimeter (CM)",
  "Millimeter (MM)",
  "Feet (FT)",
  "Inch (IN)",
  "Square Feet (SQ FT)",
  "Square Meter (SQ M)",
  "Cubic Feet (CFT)",
  "Box",
  "Packet",
  "Dozen",
  "Set",
  "Pair",
];

const GST_RATES = [0, 5, 12, 18, 28];

export default function ProductCreate() {
  const navigate = useNavigate();
  const { id } = useParams();
  const isEdit = Boolean(id);

  const { activeCompany } = useSelector((state) => state.company);

  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    productCode: "",
    hsnSac: "",
    description: "",
    productType: "goods", // 'goods' or 'service'
    uom: "Piece (PCS)",
    taxStatus: "Taxable", // 'Taxable' or 'Non-Taxable'
    gstRate: 18,
    category: "",
    brand: "",
    purchasePrice: 0,
    sellingPrice: 0,
    openingStock: 0,
    openingStockRate: 0,
  });

  useEffect(() => {
    if (isEdit) {
      loadProduct();
    }
  }, [id, isEdit]);

  const loadProduct = async () => {
    try {
      setLoading(true);
      const res = await api.get(`/products/${id}`);
      if (res.data?.success && res.data.product) {
        const prod = res.data.product;
        setFormData({
          name: prod.name || "",
          productCode: prod.productCode || "",
          hsnSac: prod.hsnSac || "",
          description: prod.description || "",
          productType: prod.type || "goods",
          uom: prod.uom || "Piece (PCS)",
          taxStatus: prod.gstRate === 0 ? "Non-Taxable" : "Taxable",
          gstRate: prod.gstRate ?? 18,
          category: prod.category || "",
          brand: prod.brand || "",
          purchasePrice: prod.purchasePrice || 0,
          sellingPrice: prod.sellingPrice || 0,
          openingStock: prod.openingStock || 0,
          openingStockRate: prod.openingStockRate || 0,
        });
      }
    } catch {
      toast.error("Failed to load product");
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    if (name === "taxStatus") {
      setFormData((prev) => ({
        ...prev,
        taxStatus: value,
        gstRate: value === "Non-Taxable" ? 0 : 18,
      }));
    } else {
      setFormData((prev) => ({ ...prev, [name]: value }));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.name.trim()) {
      toast.error("Product Name is required");
      return;
    }

    try {
      setLoading(true);
      const payload = {
        name: formData.name.trim(),
        productCode: formData.productCode.trim(),
        hsnSac: formData.hsnSac.trim(),
        description: formData.description.trim(),
        type: formData.productType,
        uom: formData.uom,
        gstRate: formData.taxStatus === "Non-Taxable" ? 0 : Number(formData.gstRate || 0),
        category: formData.category.trim(),
        brand: formData.brand.trim(),
        purchasePrice: Number(formData.purchasePrice || 0),
        sellingPrice: Number(formData.sellingPrice || 0),
        openingStock: Number(formData.openingStock || 0),
        openingStockRate: Number(formData.openingStockRate || 0),
      };

      if (isEdit) {
        await api.put(`/products/${id}`, payload);
        toast.success("Product updated successfully");
      } else {
        await api.post("/products", payload);
        toast.success("Product created successfully");
      }

      navigate("/master/product/list");
    } catch (err) {
      toast.error(err.message || "Failed to save product");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-4 max-w-5xl mx-auto animate-in fade-in">
      {/* Title Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-white px-5 py-3 rounded-xl shadow-sm border border-gray-200">
        <div className="flex items-center space-x-2">
          <div className="p-2 bg-green-50 text-[#37AD47] rounded-lg">
            <Package className="h-5 w-5" />
          </div>
          <div>
            <h2 className="font-extrabold text-sm sm:text-base tracking-wide text-gray-800 uppercase">
              {isEdit ? "EDIT PRODUCT" : "PRODUCT ENTRY FORM"}
            </h2>
            <p className="text-[11px] text-gray-400">Manage Inventory & Service Catalog</p>
          </div>
        </div>

        <Link
          to="/master/product/list"
          className="rounded bg-[#FBBC4B] hover:bg-[#e0a63e] text-gray-900 px-4 py-1.5 text-xs font-bold shadow-sm transition inline-flex items-center space-x-1"
        >
          <List className="h-3.5 w-3.5" />
          <span>PRODUCT LIST</span>
        </Link>
      </div>

      {/* Product Form */}
      <form onSubmit={handleSubmit} className="bg-white rounded-xl shadow-sm border border-gray-200 p-5 space-y-6 text-xs text-gray-700">
        {/* Section 1: Product Details */}
        <div>
          <h3 className="font-bold text-xs uppercase text-gray-400 tracking-wider border-b pb-1.5 mb-3 flex items-center space-x-1.5">
            <span className="h-2 w-2 rounded-full bg-[#37AD47]"></span>
            <span>Product Details</span>
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <div className="sm:col-span-2">
              <label className="block font-semibold mb-1">Product / Service Name *</label>
              <input
                type="text"
                name="name"
                required
                value={formData.name}
                onChange={handleChange}
                placeholder="e.g. OVEL HENDEL BLACK-6''"
                className="w-full rounded border border-gray-300 px-3 py-2 outline-none focus:border-green-500 font-medium"
              />
            </div>

            <div>
              <label className="block font-semibold mb-1">Product Search Code</label>
              <input
                type="text"
                name="productCode"
                value={formData.productCode}
                onChange={handleChange}
                placeholder="e.g. PRD-101"
                className="w-full rounded border border-gray-300 px-3 py-2 outline-none focus:border-green-500 uppercase"
              />
            </div>

            <div>
              <label className="block font-semibold mb-1">HSN / SAC Code</label>
              <input
                type="text"
                name="hsnSac"
                value={formData.hsnSac}
                onChange={handleChange}
                placeholder="e.g. 83014090"
                className="w-full rounded border border-gray-300 px-3 py-2 outline-none focus:border-green-500"
              />
            </div>

            <div>
              <label className="block font-semibold mb-1">Product Type *</label>
              <select
                name="productType"
                value={formData.productType}
                onChange={handleChange}
                className="w-full rounded border border-gray-300 px-3 py-2 outline-none focus:border-green-500 bg-white"
              >
                <option value="goods">Goods</option>
                <option value="service">Service</option>
              </select>
            </div>

            <div>
              <label className="block font-semibold mb-1">Unit of Measurement (UOM) *</label>
              <select
                name="uom"
                value={formData.uom}
                onChange={handleChange}
                className="w-full rounded border border-gray-300 px-3 py-2 outline-none focus:border-green-500 bg-white"
              >
                {UOM_OPTIONS.map((u) => (
                  <option key={u} value={u}>
                    {u}
                  </option>
                ))}
              </select>
            </div>

            <div className="sm:col-span-3">
              <label className="block font-semibold mb-1">Description</label>
              <input
                type="text"
                name="description"
                value={formData.description}
                onChange={handleChange}
                placeholder="Item specification or notes"
                className="w-full rounded border border-gray-300 px-3 py-2 outline-none focus:border-green-500"
              />
            </div>
          </div>
        </div>

        {/* Section 2: Tax Settings */}
        <div>
          <h3 className="font-bold text-xs uppercase text-gray-400 tracking-wider border-b pb-1.5 mb-3 flex items-center space-x-1.5">
            <span className="h-2 w-2 rounded-full bg-[#FBBC4B]"></span>
            <span>Tax & Categorization</span>
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div>
              <label className="block font-semibold mb-1">Tax Status *</label>
              <select
                name="taxStatus"
                value={formData.taxStatus}
                onChange={handleChange}
                className="w-full rounded border border-gray-300 px-3 py-2 outline-none focus:border-green-500 bg-white font-medium"
              >
                <option value="Taxable">Taxable</option>
                <option value="Non-Taxable">Non-Taxable</option>
              </select>
            </div>

            <div>
              <label className="block font-semibold mb-1">GST (%) *</label>
              <select
                name="gstRate"
                value={formData.gstRate}
                onChange={handleChange}
                disabled={formData.taxStatus === "Non-Taxable"}
                className="w-full rounded border border-gray-300 px-3 py-2 outline-none focus:border-green-500 bg-white disabled:bg-gray-100 disabled:text-gray-400 font-bold"
              >
                {GST_RATES.map((rate) => (
                  <option key={rate} value={rate}>
                    {rate}%
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block font-semibold mb-1">Category</label>
              <input
                type="text"
                name="category"
                value={formData.category}
                onChange={handleChange}
                placeholder="e.g. Hardware, Plywood"
                className="w-full rounded border border-gray-300 px-3 py-2 outline-none focus:border-green-500"
              />
            </div>

            <div>
              <label className="block font-semibold mb-1">Brand</label>
              <input
                type="text"
                name="brand"
                value={formData.brand}
                onChange={handleChange}
                placeholder="e.g. Philips, Goldwood"
                className="w-full rounded border border-gray-300 px-3 py-2 outline-none focus:border-green-500"
              />
            </div>
          </div>
        </div>

        {/* Section 3: Pricing & Opening Stock */}
        <div>
          <h3 className="font-bold text-xs uppercase text-gray-400 tracking-wider border-b pb-1.5 mb-3 flex items-center space-x-1.5">
            <span className="h-2 w-2 rounded-full bg-[#48B6AD]"></span>
            <span>Pricing & Stock (Cleaned Layout)</span>
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div>
              <label className="block font-semibold mb-1">Buying Price (₹)</label>
              <input
                type="number"
                name="purchasePrice"
                min="0"
                step="0.01"
                value={formData.purchasePrice}
                onChange={handleChange}
                className="w-full rounded border border-gray-300 px-3 py-2 outline-none focus:border-green-500"
              />
            </div>

            <div>
              <label className="block font-semibold mb-1">Selling Price (₹)</label>
              <input
                type="number"
                name="sellingPrice"
                min="0"
                step="0.01"
                value={formData.sellingPrice}
                onChange={handleChange}
                className="w-full rounded border border-gray-300 px-3 py-2 outline-none focus:border-green-500 font-bold text-green-700"
              />
            </div>

            <div>
              <label className="block font-semibold mb-1">Opening Stock Quantity</label>
              <input
                type="number"
                name="openingStock"
                min="0"
                step="0.001"
                value={formData.openingStock}
                onChange={handleChange}
                className="w-full rounded border border-gray-300 px-3 py-2 outline-none focus:border-green-500"
              />
            </div>

            <div>
              <label className="block font-semibold mb-1">Opening Stock Rate (₹)</label>
              <input
                type="number"
                name="openingStockRate"
                min="0"
                step="0.01"
                value={formData.openingStockRate}
                onChange={handleChange}
                className="w-full rounded border border-gray-300 px-3 py-2 outline-none focus:border-green-500"
              />
            </div>
          </div>
        </div>

        {/* Save Button */}
        <div className="pt-4 border-t flex justify-center">
          <button
            type="submit"
            disabled={loading}
            className="rounded-lg bg-[#37AD47] hover:bg-[#2f963e] text-white px-10 py-2.5 font-bold shadow-md transition inline-flex items-center space-x-2 text-sm"
          >
            <Save className="h-4 w-4" />
            <span>{loading ? "Saving Product..." : "SAVE"}</span>
          </button>
        </div>
      </form>
    </div>
  );
}
