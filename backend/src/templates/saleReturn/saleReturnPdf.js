const PDFDocument = require("pdfkit");

/* =========================================================
   HELPERS
========================================================= */

const money = (value) => {
  const number = Number(value || 0);

  return number.toLocaleString("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
};

const formatDate = (date) => {
  if (!date) return "-";

  const d = new Date(date);

  if (Number.isNaN(d.getTime())) {
    return "-";
  }

  return d.toLocaleDateString("en-IN");
};

const safeText = (value) => {
  if (value === undefined || value === null) {
    return "-";
  }

  return String(value);
};

const getCompanyName = (company) => {
  return (
    company?.companyName ||
    company?.name ||
    company?.businessName ||
    "Company"
  );
};

const getPartyName = (party) => {
  return (
    party?.name ||
    party?.customerName ||
    party?.supplierName ||
    "-"
  );
};

const getAddress = (data) => {
  if (!data) return "-";

  const parts = [
    data.address,
    data.addressLine1,
    data.addressLine2,
    data.city,
    data.state,
    data.pincode,
  ].filter(Boolean);

  return parts.length ? parts.join(", ") : "-";
};

/* =========================================================
   NUMBER TO WORDS
========================================================= */

const numberToWords = (number) => {
  const num = Math.floor(Number(number || 0));

  if (num === 0) {
    return "Zero Rupees Only";
  }

  const ones = [
    "",
    "One",
    "Two",
    "Three",
    "Four",
    "Five",
    "Six",
    "Seven",
    "Eight",
    "Nine",
    "Ten",
    "Eleven",
    "Twelve",
    "Thirteen",
    "Fourteen",
    "Fifteen",
    "Sixteen",
    "Seventeen",
    "Eighteen",
    "Nineteen",
  ];

  const tens = [
    "",
    "",
    "Twenty",
    "Thirty",
    "Forty",
    "Fifty",
    "Sixty",
    "Seventy",
    "Eighty",
    "Ninety",
  ];

  const twoDigits = (n) => {
    if (n < 20) {
      return ones[n];
    }

    return (
      tens[Math.floor(n / 10)] +
      (n % 10 ? " " + ones[n % 10] : "")
    );
  };

  const convert = (n) => {
    let result = "";

    if (n >= 10000000) {
      result += convert(Math.floor(n / 10000000)) + " Crore ";
      n %= 10000000;
    }

    if (n >= 100000) {
      result += convert(Math.floor(n / 100000)) + " Lakh ";
      n %= 100000;
    }

    if (n >= 1000) {
      result += convert(Math.floor(n / 1000)) + " Thousand ";
      n %= 1000;
    }

    if (n >= 100) {
      result += convert(Math.floor(n / 100)) + " Hundred ";
      n %= 100;
    }

    if (n > 0) {
      if (result !== "") {
        result += "and ";
      }

      result += twoDigits(n);
    }

    return result.trim();
  };

  return `${convert(num)} Rupees Only`;
};

/* =========================================================
   TABLE HEADER
========================================================= */

const drawTableHeader = (doc, y) => {
  const columns = [
    {
      x: 35,
      width: 28,
      title: "SR",
    },
    {
      x: 63,
      width: 150,
      title: "DESCRIPTION",
    },
    {
      x: 213,
      width: 55,
      title: "HSN/SAC",
    },
    {
      x: 268,
      width: 42,
      title: "QTY",
    },
    {
      x: 310,
      width: 60,
      title: "RATE",
    },
    {
      x: 370,
      width: 45,
      title: "DISC %",
    },
    {
      x: 415,
      width: 45,
      title: "GST %",
    },
    {
      x: 460,
      width: 100,
      title: "RETURN AMOUNT",
    },
  ];

  doc
    .rect(35, y, 525, 25)
    .fillAndStroke("#eeeeee", "#444444");

  doc.fillColor("#000000");

  columns.forEach((column) => {
    doc
      .font("Helvetica-Bold")
      .fontSize(7)
      .text(
        column.title,
        column.x + 2,
        y + 8,
        {
          width: column.width - 4,
          align: "center",
        }
      );
  });

  return columns;
};

/* =========================================================
   PDF GENERATOR
========================================================= */

const generateSaleReturnPdf = (
  saleReturn,
  responseStream
) => {
  const doc = new PDFDocument({
    size: "A4",
    margin: 35,
    bufferPages: true,
  });

  doc.pipe(responseStream);

  const company = saleReturn.company || {};
  const branch = saleReturn.branch || {};
  const customer = saleReturn.customer || {};
  const account = saleReturn.account || {};
  const refundAccount =
    saleReturn.refundAccount || {};
  const originalSale =
    saleReturn.originalSale || {};

  const companyName = getCompanyName(company);

  /* =======================================================
     COMPANY HEADER
  ======================================================= */

  doc
    .font("Helvetica-Bold")
    .fontSize(17)
    .text(companyName, 35, 35, {
      width: 525,
      align: "center",
    });

  doc
    .font("Helvetica")
    .fontSize(9)
    .text(
      getAddress(company),
      35,
      58,
      {
        width: 525,
        align: "center",
      }
    );

  if (company.phone) {
    doc.text(
      `Phone: ${safeText(company.phone)}`,
      35,
      73,
      {
        width: 525,
        align: "center",
      }
    );
  }

  if (company.email) {
    doc.text(
      `Email: ${safeText(company.email)}`,
      35,
      87,
      {
        width: 525,
        align: "center",
      }
    );
  }

  if (company.gstNumber || company.gstin) {
    doc.text(
      `GSTIN: ${safeText(
        company.gstNumber || company.gstin
      )}`,
      35,
      101,
      {
        width: 525,
        align: "center",
      }
    );
  }

  doc
    .moveTo(35, 120)
    .lineTo(560, 120)
    .stroke();

  doc
    .font("Helvetica-Bold")
    .fontSize(15)
    .text("SALE RETURN", 35, 132, {
      width: 525,
      align: "center",
    });

  /* =======================================================
     RETURN DETAILS
  ======================================================= */

  const detailsY = 165;

  doc
    .rect(35, detailsY, 525, 75)
    .stroke();

  doc
    .font("Helvetica-Bold")
    .fontSize(9)
    .text("Return No.", 45, detailsY + 12);

  doc
    .font("Helvetica")
    .text(
      safeText(saleReturn.returnNumber),
      115,
      detailsY + 12
    );

  doc
    .font("Helvetica-Bold")
    .text("Return Date", 300, detailsY + 12);

  doc
    .font("Helvetica")
    .text(
      formatDate(saleReturn.returnDate),
      380,
      detailsY + 12
    );

  doc
    .font("Helvetica-Bold")
    .text("Original Sale", 45, detailsY + 37);

  doc
    .font("Helvetica")
    .text(
      safeText(
        originalSale.invoiceNumber ||
          originalSale.saleNumber ||
          originalSale._id
      ),
      115,
      detailsY + 37
    );

  doc
    .font("Helvetica-Bold")
    .text("Original Date", 300, detailsY + 37);

  doc
    .font("Helvetica")
    .text(
      formatDate(
        originalSale.invoiceDate ||
          originalSale.saleDate
      ),
      380,
      detailsY + 37
    );

  doc
    .font("Helvetica-Bold")
    .text("Branch", 45, detailsY + 60);

  doc
    .font("Helvetica")
    .text(
      safeText(
        branch.branchName ||
          branch.name ||
          "-"
      ),
      115,
      detailsY + 60
    );

  /* =======================================================
     CUSTOMER
  ======================================================= */

  const customerY = 255;

  doc
    .rect(35, customerY, 525, 75)
    .stroke();

  doc
    .font("Helvetica-Bold")
    .fontSize(9)
    .text(
      "CUSTOMER DETAILS",
      45,
      customerY + 10
    );

  doc
    .font("Helvetica-Bold")
    .text("Name:", 45, customerY + 30);

  doc
    .font("Helvetica")
    .text(
      getPartyName(customer),
      90,
      customerY + 30
    );

  doc
    .font("Helvetica-Bold")
    .text("Phone:", 300, customerY + 30);

  doc
    .font("Helvetica")
    .text(
      safeText(customer.phone),
      345,
      customerY + 30
    );

  doc
    .font("Helvetica-Bold")
    .text("GSTIN:", 45, customerY + 52);

  doc
    .font("Helvetica")
    .text(
      safeText(
        customer.gstNumber ||
          customer.gstin
      ),
      90,
      customerY + 52
    );

  doc
    .font("Helvetica-Bold")
    .text("Address:", 300, customerY + 52);

  doc
    .font("Helvetica")
    .text(
      getAddress(customer),
      350,
      customerY + 52,
      {
        width: 195,
      }
    );

  /* =======================================================
     ITEMS TABLE
  ======================================================= */

  let y = 350;

  const columns = drawTableHeader(doc, y);

  y += 25;

  const items = Array.isArray(saleReturn.items)
    ? saleReturn.items
    : [];

  items.forEach((item, index) => {
    if (y > 720) {
      doc.addPage();

      y = 40;

      drawTableHeader(doc, y);

      y += 25;
    }

    const product = item.product || {};

    const rowHeight = 28;

    doc
      .rect(35, y, 525, rowHeight)
      .stroke();

    const values = [
      index + 1,
      product.name ||
        item.description ||
        "-",
      product.hsnSac || "-",
      item.quantity || 0,
      money(item.rate),
      item.discountPercent || 0,
      item.gstRate || 0,
      money(item.returnAmount),
    ];

    values.forEach((value, valueIndex) => {
      const column = columns[valueIndex];

      doc
        .font("Helvetica")
        .fontSize(7)
        .text(
          safeText(value),
          column.x + 2,
          y + 8,
          {
            width: column.width - 4,
            align:
              valueIndex === 1
                ? "left"
                : "center",
          }
        );
    });

    y += rowHeight;
  });

  /* =======================================================
     TOTALS
  ======================================================= */

  y += 15;

  if (y > 650) {
    doc.addPage();
    y = 50;
  }

  doc
    .font("Helvetica-Bold")
    .fontSize(10)
    .text("RETURN SUMMARY", 35, y);

  y += 20;

  const summaryRows = [
    [
      "Product Amount",
      saleReturn.productAmount,
    ],
    [
      "Discount Amount",
      saleReturn.discountAmount,
    ],
    [
      "Taxable Amount",
      saleReturn.taxableAmount,
    ],
    [
      "CGST",
      saleReturn.cgstAmount,
    ],
    [
      "SGST",
      saleReturn.sgstAmount,
    ],
    [
      "IGST",
      saleReturn.igstAmount,
    ],
    [
      "Round Off",
      saleReturn.roundOff,
    ],
    [
      "Total Return Amount",
      saleReturn.returnAmount ??
        saleReturn.totalAmount,
    ],
  ];

  summaryRows.forEach(([label, value]) => {
    doc
      .font(
        label === "Total Return Amount"
          ? "Helvetica-Bold"
          : "Helvetica"
      )
      .fontSize(9)
      .text(label, 370, y, {
        width: 120,
        align: "right",
      });

    doc
      .font(
        label === "Total Return Amount"
          ? "Helvetica-Bold"
          : "Helvetica"
      )
      .text(
        `₹ ${money(value)}`,
        495,
        y,
        {
          width: 65,
          align: "right",
        }
      );

    y += 17;
  });

  /* =======================================================
     REFUND INFORMATION
  ======================================================= */

  y += 10;

  doc
    .font("Helvetica-Bold")
    .fontSize(9)
    .text("Refund Information", 35, y);

  y += 18;

  doc
    .font("Helvetica")
    .text(
      `Refund Mode: ${safeText(
        saleReturn.refundMode
      )}`,
      35,
      y
    );

  y += 15;

  doc
    .text(
      `Refund Account: ${safeText(
        refundAccount.name
      )}`,
      35,
      y
    );

  /* =======================================================
     AMOUNT IN WORDS
  ======================================================= */

  y += 25;

  doc
    .font("Helvetica-Bold")
    .fontSize(9)
    .text("Amount in Words:", 35, y);

  doc
    .font("Helvetica")
    .text(
      numberToWords(
        saleReturn.returnAmount ??
          saleReturn.totalAmount
      ),
      125,
      y,
      {
        width: 435,
      }
    );

  /* =======================================================
     NARRATION
  ======================================================= */

  if (saleReturn.narration) {
    y += 30;

    doc
      .font("Helvetica-Bold")
      .text("Narration:", 35, y);

    doc
      .font("Helvetica")
      .text(
        safeText(saleReturn.narration),
        90,
        y,
        {
          width: 470,
        }
      );
  }

  /* =======================================================
     ACCOUNT
  ======================================================= */

  if (account.name) {
    y += 30;

    doc
      .font("Helvetica-Bold")
      .text("Account:", 35, y);

    doc
      .font("Helvetica")
      .text(
        safeText(account.name),
        90,
        y
      );
  }

  /* =======================================================
     SIGNATURE
  ======================================================= */

  const signatureY = 735;

  doc
    .font("Helvetica")
    .fontSize(9)
    .text(
      "Authorised Signatory",
      430,
      signatureY,
      {
        width: 120,
        align: "center",
      }
    );

  doc
    .moveTo(420, signatureY - 10)
    .lineTo(550, signatureY - 10)
    .stroke();

  /* =======================================================
     FOOTER
  ======================================================= */

  doc
    .fontSize(8)
    .font("Helvetica")
    .text(
      "This is a computer generated document.",
      35,
      785,
      {
        width: 525,
        align: "center",
      }
    );

  doc.end();
};

module.exports = {
  generateSaleReturnPdf,
};