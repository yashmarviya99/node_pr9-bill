import React from "react";
import { X, Printer, Download } from "lucide-react";
import { formatCurrency, formatNumber, amountToWords } from "../../utils/currency";
import { formatDate } from "../../utils/date";

export default function InvoicePreviewModal({ isOpen, onClose, invoice, company }) {
  if (!isOpen || !invoice) return null;

  const handlePrint = () => {
    window.print();
  };

  const compName = company?.companyName || invoice.company?.companyName || "BWC RJT";
  const compAddress = company?.address || invoice.company?.address || "KORAT VADI, SAPTAPADI PARTY-PLOT";
  const compPhone = company?.phone || invoice.company?.phone || "8200897507";
  const compCity = company?.city || invoice.company?.city || "RAJKOT";
  const compState = company?.state || invoice.company?.state || "Gujarat";
  const compGstin = company?.gstNumber || invoice.company?.gstNumber || "24AAAPB1234F1Z5";

  const customerName = invoice.account?.name || invoice.customer?.name || "Customer Party";
  const customerAddress = invoice.account?.address || invoice.customer?.address || "Atmiya School, Satya Sai Road";
  const customerCity = invoice.account?.city || invoice.customer?.city || "Rajkot";
  const customerPhone = invoice.account?.phone || invoice.customer?.phone || "9824419911";
  const customerGstin = invoice.account?.gstNumber || invoice.customer?.gstNumber || "24AAAPB1234F1Z5";

  const items = invoice.items || [];
  const totalQty = items.reduce((acc, it) => acc + Number(it.quantity || 0), 0);
  const subTotal = invoice.taxableAmount || invoice.productAmount || 0;
  const cgst = invoice.totalCgstAmount || invoice.cgstAmount || 0;
  const sgst = invoice.totalSgstAmount || invoice.sgstAmount || 0;
  const igst = invoice.totalIgstAmount || invoice.igstAmount || 0;
  const roundOff = invoice.roundOff || 0;
  const grandTotal = invoice.totalAmount || 0;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-2 sm:p-4 overflow-y-auto">
      <div className="w-full max-w-3xl rounded-xl bg-white shadow-2xl overflow-hidden my-auto animate-in fade-in">
        {/* Top Controls Bar (Hidden during print) */}
        <div className="flex items-center justify-between bg-[#4A4A4A] px-5 py-3 text-white no-print">
          <div className="font-bold text-sm">TAX INVOICE PREVIEW</div>
          <div className="flex items-center space-x-2">
            <button
              onClick={handlePrint}
              className="rounded bg-[#2BC481] hover:bg-[#25ab70] px-3.5 py-1.5 text-xs font-bold text-white shadow inline-flex items-center space-x-1"
            >
              <Printer className="h-3.5 w-3.5" />
              <span>Print Invoice</span>
            </button>
            <button
              onClick={onClose}
              className="rounded p-1 hover:bg-gray-600 text-gray-300 hover:text-white"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Printable Invoice Sheet (Page 21 Layout) */}
        <div className="p-6 sm:p-8 bg-white text-gray-800 text-xs border border-gray-300 font-sans">
          {/* Company Header */}
          <div className="text-center pb-2 border-b border-gray-800">
            <h1 className="text-2xl font-black uppercase tracking-wider text-gray-900">{compName}</h1>
            <p className="text-xs text-gray-600 mt-0.5">
              {compAddress}, {compCity}, {compState}
            </p>
            <p className="text-xs text-gray-700 font-medium">
              Tel/M: {compPhone} {compGstin ? `• GSTIN: ${compGstin}` : ""}
            </p>
            <div className="mt-2 inline-block border-2 border-gray-900 px-4 py-0.5 font-black text-sm uppercase tracking-widest bg-gray-50">
              TAX INVOICE
            </div>
            <div className="text-[10px] text-gray-500 mt-1 font-semibold flex justify-end space-x-3">
              <span>[✓] Original</span>
              <span>[ ] Duplicate</span>
              <span>[ ] Transporter</span>
            </div>
          </div>

          {/* Party and Invoice Details Grid */}
          <div className="grid grid-cols-2 border-b border-gray-800 py-2">
            <div className="pr-4 border-r border-gray-300">
              <span className="text-[10px] text-gray-500 font-bold uppercase">To ,</span>
              <div className="font-black text-sm text-gray-900">{customerName}</div>
              <p className="text-xs text-gray-600 mt-0.5">
                Address: {customerAddress}, {customerCity}
              </p>
              <div className="text-[11px] text-gray-700 mt-1">
                State: <strong>{compState}</strong> • State Code: <strong>24</strong> • Tel/M: <strong>{customerPhone}</strong>
              </div>
              {customerGstin && (
                <div className="text-[11px] font-mono text-gray-700">
                  GSTIN/UIN: <strong>{customerGstin}</strong>
                </div>
              )}
            </div>

            <div className="pl-4 space-y-1">
              <div className="flex justify-between">
                <span className="text-gray-500 font-semibold">Invoice No.</span>
                <span className="font-black text-sm text-gray-900">{invoice.invoiceNumber || "SALE-00001"}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500 font-semibold">Date</span>
                <span className="font-bold text-gray-800">{formatDate(invoice.invoiceDate)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500 font-semibold">Type</span>
                <span className="font-semibold text-gray-800 uppercase">{invoice.invoiceType || "Sale"}</span>
              </div>
            </div>
          </div>

          {/* Items Table */}
          <table className="w-full text-left text-xs border-b border-gray-800 border-collapse mt-2">
            <thead className="border-b border-gray-800 bg-gray-100 font-black text-[11px]">
              <tr>
                <th className="py-1.5 px-2 border-r border-gray-300 w-8 text-center">SR</th>
                <th className="py-1.5 px-2 border-r border-gray-300">Description of Goods</th>
                <th className="py-1.5 px-2 border-r border-gray-300 w-20 text-center">HSN/SAC</th>
                <th className="py-1.5 px-2 border-r border-gray-300 w-14 text-center">GST</th>
                <th className="py-1.5 px-2 border-r border-gray-300 w-16 text-center">Quantity</th>
                <th className="py-1.5 px-2 border-r border-gray-300 w-16 text-right">Rate</th>
                <th className="py-1.5 px-2 border-r border-gray-300 w-14 text-center">Disc.(%)</th>
                <th className="py-1.5 px-2 text-right w-24">Sub Total</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {items.map((it, idx) => (
                <tr key={idx}>
                  <td className="py-1.5 px-2 text-center border-r border-gray-300 text-gray-500">{idx + 1}</td>
                  <td className="py-1.5 px-2 border-r border-gray-300 font-bold text-gray-900">
                    {it.productName || it.product?.name}
                    {it.description && <span className="block text-[10px] font-normal text-gray-500">{it.description}</span>}
                  </td>
                  <td className="py-1.5 px-2 text-center border-r border-gray-300 font-mono text-[11px] text-gray-600">
                    {it.hsnSac || "83014090"}
                  </td>
                  <td className="py-1.5 px-2 text-center border-r border-gray-300 font-semibold">{it.gstRate || 0}%</td>
                  <td className="py-1.5 px-2 text-center border-r border-gray-300 font-bold">{it.quantity} {it.uom || "PCS"}</td>
                  <td className="py-1.5 px-2 text-right border-r border-gray-300">{formatNumber(it.rate)}</td>
                  <td className="py-1.5 px-2 text-center border-r border-gray-300">{it.discountPercent || 0}%</td>
                  <td className="py-1.5 px-2 text-right font-bold text-gray-900">{formatNumber(it.amount || it.taxableAmount)}</td>
                </tr>
              ))}
            </tbody>
            {/* Total Quantity Row */}
            <tfoot className="border-t border-b border-gray-800 font-black bg-gray-50">
              <tr>
                <td colSpan="4" className="py-1.5 px-2 text-right border-r border-gray-300 uppercase">
                  TOTAL
                </td>
                <td className="py-1.5 px-2 text-center border-r border-gray-300">{totalQty} PCS</td>
                <td colSpan="2" className="border-r border-gray-300"></td>
                <td className="py-1.5 px-2 text-right">{formatCurrency(subTotal)}</td>
              </tr>
            </tfoot>
          </table>

          {/* Bank & Summary Details Grid */}
          <div className="grid grid-cols-2 border-b border-gray-800 py-3">
            {/* Left: Company Bank Details */}
            <div className="pr-4 border-r border-gray-300 text-[11px] space-y-1">
              <span className="font-extrabold text-gray-900 block border-b pb-0.5 mb-1 uppercase">
                Company's Bank Details
              </span>
              <div className="flex">
                <span className="w-20 text-gray-500">Name:</span>
                <span className="font-bold text-gray-800">State Bank of India</span>
              </div>
              <div className="flex">
                <span className="w-20 text-gray-500">A/C No.:</span>
                <span className="font-mono font-bold text-gray-800">308819203912</span>
              </div>
              <div className="flex">
                <span className="w-20 text-gray-500">IFSC Code:</span>
                <span className="font-mono font-bold text-gray-800">SBIN0001234</span>
              </div>
              <div className="flex">
                <span className="w-20 text-gray-500">Branch:</span>
                <span className="font-medium text-gray-800">Kalawad Road, Rajkot</span>
              </div>
            </div>

            {/* Right: Invoice Summary */}
            <div className="pl-4 space-y-1 text-xs">
              <div className="flex justify-between py-0.5">
                <span className="text-gray-600">Sub Total</span>
                <span className="font-bold">{formatCurrency(subTotal)}</span>
              </div>
              <div className="flex justify-between py-0.5">
                <span className="text-gray-600">CGST</span>
                <span>{formatCurrency(cgst)}</span>
              </div>
              <div className="flex justify-between py-0.5">
                <span className="text-gray-600">SGST</span>
                <span>{formatCurrency(sgst)}</span>
              </div>
              <div className="flex justify-between py-0.5">
                <span className="text-gray-600">IGST</span>
                <span>{formatCurrency(igst)}</span>
              </div>
              <div className="flex justify-between py-0.5 text-gray-500">
                <span>Round Off</span>
                <span>{roundOff >= 0 ? `+${roundOff.toFixed(2)}` : roundOff.toFixed(2)}</span>
              </div>
              <div className="flex justify-between py-1.5 border-t border-b border-gray-900 font-black text-sm bg-gray-100 px-1">
                <span>Total Amount</span>
                <span className="text-green-800">{formatCurrency(grandTotal)}</span>
              </div>
            </div>
          </div>

          {/* Amount in words */}
          <div className="py-2 border-b border-gray-800 text-[11px]">
            <span className="text-gray-500 font-semibold">Amt. Chargeable (in words): </span>
            <strong className="text-gray-900 uppercase">{amountToWords(grandTotal)}</strong>
            <span className="float-right text-gray-400 font-semibold">E. & O.E.</span>
          </div>

          {/* Footer & Signatory Box */}
          <div className="grid grid-cols-2 pt-3">
            <div className="text-[11px] text-gray-600 pr-4 space-y-1">
              <span className="font-bold text-gray-800 block">Narration:</span>
              <p>{invoice.narration || "Standard sale bill."}</p>
              <span className="font-bold text-gray-800 block pt-1">Terms and Condition:</span>
              <p className="text-[10px] text-gray-500">{invoice.termsAndConditions || "Goods once sold will not be taken back or exchanged."}</p>
            </div>

            <div className="text-right flex flex-col justify-between pl-4">
              <span className="font-bold text-xs text-gray-800">For, {compName}</span>
              <div className="pt-12 text-[10px] text-gray-500 border-t border-gray-400 mt-8">
                Authorised Signatory
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
