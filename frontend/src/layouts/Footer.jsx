import React from "react";
import { Download, Monitor, Phone, Mail, Clock, ShieldCheck } from "lucide-react";

export default function Footer() {
  return (
    <footer className="mt-12 bg-white border-t border-gray-200 pt-8 pb-6 px-4 text-center no-print">
      <div className="mx-auto max-w-4xl">
        {/* Logo in center */}
        <div className="flex justify-center mb-2">
          <img
            src="/business-bill-logo.png"
            alt="BUSINESS BILL"
            className="h-14 sm:h-16 w-auto object-contain"
          />
        </div>

        {/* Software Title */}
        <h2 className="text-xl sm:text-2xl font-extrabold tracking-wide text-gray-800 uppercase">
          GST BILLING SOFTWARE
        </h2>
        <p className="text-xs text-gray-500 mt-0.5">
          Version 5.0 • High Performance Business Management System
        </p>

        {/* Remote Support Action Buttons */}
        <div className="mt-5 flex flex-wrap items-center justify-center gap-3">
          <a
            href="anydesk:open"
            className="inline-flex items-center space-x-2 rounded-full bg-[#48B6AD] hover:bg-[#3ca39a] text-white px-6 py-2 text-xs sm:text-sm font-semibold shadow-md transition"
          >
            <Monitor className="h-4 w-4" />
            <span>Open AnyDesk</span>
          </a>
          <a
            href="https://anydesk.com/en/downloads"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center space-x-2 rounded-full bg-[#DF6B6B] hover:bg-[#cf5b5b] text-white px-6 py-2 text-xs sm:text-sm font-semibold shadow-md transition"
          >
            <Download className="h-4 w-4" />
            <span>Download AnyDesk</span>
          </a>
        </div>

        {/* Customer Support Info */}
        <div className="mt-6 border-t border-gray-100 pt-5">
          <div className="flex flex-wrap items-center justify-center gap-6 text-xs sm:text-sm text-gray-700">
            <div className="flex items-center space-x-2 font-medium">
              <span className="text-gray-500">Customer Support:</span>
              <a
                href="tel:+918320916526"
                className="inline-flex items-center space-x-1 text-[#37AD47] font-bold hover:underline"
              >
                <Phone className="h-4 w-4" />
                <span>+91 83209-16526</span>
              </a>
            </div>

            <div className="flex items-center space-x-1.5 text-gray-500 text-xs">
              <Mail className="h-3.5 w-3.5 text-blue-500" />
              <span>support@businessbill.in</span>
            </div>
          </div>

          <div className="mt-2 text-xs text-gray-500 flex flex-wrap items-center justify-center gap-3">
            <span className="flex items-center space-x-1">
              <Clock className="h-3 w-3 text-amber-500" />
              <span>Support Time: 10 AM To 6 PM (Monday To Friday)</span>
            </span>
            <span>•</span>
            <span>Support Time: 10 AM To 2 PM (Saturday)</span>
          </div>

          <p className="mt-4 text-[11px] text-gray-400">
            © Neetai Tech. Version 5.0 • All Rights Reserved • GST Compliant Billing & Accounting
          </p>
        </div>
      </div>
    </footer>
  );
}
