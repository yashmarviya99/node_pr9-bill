const PDFDocument = require("pdfkit");

const money = (value) =>
  `Rs. ${Number(value || 0).toFixed(2)}`;

const formatDate = (value) => {
  if (!value) return "-";

  return new Date(
    value
  ).toLocaleDateString(
    "en-IN"
  );
};

const numberToWords = (
  amount
) => {
  const number =
    Math.round(
      Number(amount || 0)
    );

  if (number === 0) {
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

  const twoDigits = (
    num
  ) => {
    if (num < 20) {
      return ones[num];
    }

    return (
      tens[
        Math.floor(
          num / 10
        )
      ] +
      (num % 10
        ? ` ${ones[num % 10]}`
        : "")
    );
  };

  const threeDigits = (
    num
  ) => {
    if (num < 100) {
      return twoDigits(num);
    }

    return `${ones[
      Math.floor(num / 100)
    ]} Hundred${
      num % 100
        ? ` ${twoDigits(
            num % 100
          )}`
        : ""
    }`;
  };

  let result = "";

  const crore =
    Math.floor(
      number / 10000000
    );

  const lakh =
    Math.floor(
      (number % 10000000) /
        100000
    );

  const thousand =
    Math.floor(
      (number % 100000) /
        1000
    );

  const remainder =
    number % 1000;

  if (crore) {
    result += `${threeDigits(
      crore
    )} Crore `;
  }

  if (lakh) {
    result += `${threeDigits(
      lakh
    )} Lakh `;
  }

  if (thousand) {
    result += `${threeDigits(
      thousand
    )} Thousand `;
  }

  if (remainder) {
    result += `${threeDigits(
      remainder
    )} `;
  }

  return `${result.trim()} Rupees Only`;
};

const safeText = (
  value,
  fallback = "-"
) => {
  if (
    value === undefined ||
    value === null ||
    value === ""
  ) {
    return fallback;
  }

  return String(value);
};

const generateSaleInvoicePdf = (
  sale,
  stream
) => {
  const doc =
    new PDFDocument({
      size: "A4",
      margin: 35,
      bufferPages: true,
    });

  doc.pipe(stream);

  const left = 35;
  const right = 560;
  const contentWidth =
    right - left;

  const company =
    sale.company || {};

  const customer =
    sale.customer || {};

  const branch =
    sale.branch || {};

  /*
   * IMPORTANT:
   * Bank details come from Account.
   *
   * sale.bankAccount is selected
   * in saleController.
   */
  const bankAccount =
    sale.bankAccount ||
    sale.paymentAccount ||
    {};

  /*
   * ------------------------------------------------
   * HEADER
   * ------------------------------------------------
   */

  doc
    .fontSize(18)
    .font(
      "Helvetica-Bold"
    )
    .text(
      safeText(
        company.companyName,
        "BUSINESS BILL"
      ),
      left,
      35,
      {
        width:
          contentWidth,
        align: "center",
      }
    );

  doc
    .fontSize(9)
    .font("Helvetica")
    .text(
      safeText(
        company.address,
        ""
      ),
      left,
      60,
      {
        width:
          contentWidth,
        align: "center",
      }
    );

  const companyLocation =
    [
      company.city,
      company.state,
      company.pincode,
    ]
      .filter(Boolean)
      .join(", ");

  if (companyLocation) {
    doc.text(
      companyLocation,
      left,
      73,
      {
        width:
          contentWidth,
        align: "center",
      }
    );
  }

  const companyMobile =
    company.mobile ||
    company.phone ||
    "";

  const companyEmail =
    company.email || "";

  if (
    companyMobile ||
    companyEmail
  ) {
    doc.text(
      [
        companyMobile
          ? `Mobile: ${companyMobile}`
          : "",

        companyEmail
          ? `Email: ${companyEmail}`
          : "",
      ]
        .filter(Boolean)
        .join(" | "),
      left,
      86,
      {
        width:
          contentWidth,
        align: "center",
      }
    );
  }

  if (
    company.gstNumber
  ) {
    doc.text(
      `GSTIN: ${company.gstNumber}`,
      left,
      99,
      {
        width:
          contentWidth,
        align: "center",
      }
    );
  }

  doc
    .moveTo(left, 118)
    .lineTo(
      right,
      118
    )
    .stroke();

  doc
    .fontSize(15)
    .font(
      "Helvetica-Bold"
    )
    .text(
      "TAX INVOICE",
      left,
      130,
      {
        width:
          contentWidth,
        align: "center",
      }
    );

  /*
   * ------------------------------------------------
   * CUSTOMER + INVOICE DETAILS
   * ------------------------------------------------
   */

  const detailsTop =
    165;

  doc
    .fontSize(9)
    .font(
      "Helvetica-Bold"
    )
    .text(
      "TO",
      left,
      detailsTop
    );

  doc
    .font("Helvetica")
    .text(
      safeText(
        customer.name
      ),
      left,
      detailsTop + 15
    );

  if (
    customer.address
  ) {
    doc.text(
      `Address: ${customer.address}`,
      left,
      detailsTop + 30,
      {
        width: 250,
      }
    );
  }

  if (
    customer.state
  ) {
    doc.text(
      `State: ${customer.state}`,
      left,
      detailsTop + 45
    );
  }

  if (
    customer.phone
  ) {
    doc.text(
      `Mobile: ${customer.phone}`,
      left,
      detailsTop + 60
    );
  }

  if (
    customer.gstNumber
  ) {
    doc.text(
      `GSTIN: ${customer.gstNumber}`,
      left,
      detailsTop + 75
    );
  }

  const invoiceX =
    350;

  doc
    .font(
      "Helvetica-Bold"
    )
    .text(
      "Invoice Details",
      invoiceX,
      detailsTop
    );

  doc
    .font("Helvetica")
    .text(
      `Invoice No.: ${safeText(
        sale.invoiceNumber
      )}`,
      invoiceX,
      detailsTop + 17
    );

  doc.text(
    `Invoice Date: ${formatDate(
      sale.invoiceDate
    )}`,
    invoiceX,
    detailsTop + 32
  );

  doc.text(
    `Invoice Type: ${safeText(
      sale.invoiceType
    ).toUpperCase()}`,
    invoiceX,
    detailsTop + 47
  );

  if (
    branch.branchName
  ) {
    doc.text(
      `Branch: ${branch.branchName}`,
      invoiceX,
      detailsTop + 62
    );
  }

  /*
   * ------------------------------------------------
   * PRODUCT TABLE
   * ------------------------------------------------
   */

  let tableTop =
    265;

  doc
    .fontSize(8)
    .font(
      "Helvetica-Bold"
    );

  doc
    .rect(
      left,
      tableTop,
      contentWidth,
      25
    )
    .stroke();

  const columns = {
    sr: 38,
    description: 125,
    hsn: 62,
    gst: 40,
    qty: 45,
    rate: 65,
    discount: 55,
    subtotal: 70,
  };

  let x = left;

  Object.entries(
    columns
  ).forEach(
    ([
      key,
      width,
    ]) => {
      doc
        .moveTo(
          x,
          tableTop
        )
        .lineTo(
          x,
          tableTop + 25
        )
        .stroke();

      x += width;
    }
  );

  doc
    .moveTo(
      x,
      tableTop
    )
    .lineTo(
      x,
      tableTop + 25
    )
    .stroke();

  const headers = [
    ["sr", "SR."],
    [
      "description",
      "Description",
    ],
    ["hsn", "HSN/SAC"],
    ["gst", "GST %"],
    ["qty", "Qty"],
    ["rate", "Rate"],
    [
      "discount",
      "Disc. %",
    ],
    [
      "subtotal",
      "Sub Total",
    ],
  ];

  x = left;

  headers.forEach(
    ([
      key,
      label,
    ]) => {
      doc.text(
        label,
        x + 2,
        tableTop + 8,
        {
          width:
            columns[key] -
            4,
          align: "center",
        }
      );

      x +=
        columns[key];
    }
  );

  let rowY =
    tableTop + 25;

  const items =
    sale.items || [];

  let totalQuantity = 0;

  items.forEach(
    (
      item,
      index
    ) => {
      const rowHeight =
        42;

      if (
        rowY +
          rowHeight >
        750
      ) {
        doc.addPage();

        rowY = 40;

        doc
          .fontSize(8)
          .font(
            "Helvetica-Bold"
          )
          .text(
            "TAX INVOICE - CONTINUED",
            left,
            rowY
          );

        rowY += 25;
      }

      doc
        .rect(
          left,
          rowY,
          contentWidth,
          rowHeight
        )
        .stroke();

      x = left;

      Object.values(
        columns
      ).forEach(
        (width) => {
          doc
            .moveTo(
              x,
              rowY
            )
            .lineTo(
              x,
              rowY +
                rowHeight
            )
            .stroke();

          x += width;
        }
      );

      doc
        .fontSize(7)
        .font("Helvetica");

      const productName =
        item.productName ||
        (
          item.product &&
          item.product.name
        ) ||
        "Product";

      const description =
        item.description ||
        productName;

      const hsn =
        item.hsnSac ||
        "";

      const gst =
        Number(
          item.gstRate ||
            0
        ).toFixed(2);

      const quantity =
        Number(
          item.quantity ||
            0
        ).toFixed(2);

      const rate =
        money(
          item.rate
        );

      const discount =
        Number(
          item.discountPercent ||
            0
        ).toFixed(2);

      const subtotal =
        money(
          item.invoiceAmount ||
            item.totalAmount ||
            item.amount
        );

      totalQuantity +=
        Number(
          item.quantity ||
            0
        );

      const values = [
        [
          "sr",
          String(
            index + 1
          ),
        ],

        [
          "description",
          description,
        ],

        [
          "hsn",
          hsn,
        ],

        [
          "gst",
          gst,
        ],

        [
          "qty",
          quantity,
        ],

        [
          "rate",
          rate,
        ],

        [
          "discount",
          discount,
        ],

        [
          "subtotal",
          subtotal,
        ],
      ];

      x = left;

      values.forEach(
        ([
          key,
          value,
        ]) => {
          doc.text(
            String(value),
            x + 3,
            rowY + 8,
            {
              width:
                columns[key] -
                6,

              height:
                rowHeight -
                10,

              align:
                key ===
                  "description" ||
                key === "hsn"
                  ? "left"
                  : "center",
            }
          );

          x +=
            columns[key];
        }
      );

      rowY +=
        rowHeight;
    }
  );

  /*
   * TOTAL QUANTITY ROW
   */

  const totalRowHeight =
    25;

  doc
    .rect(
      left,
      rowY,
      contentWidth,
      totalRowHeight
    )
    .stroke();

  x = left;

  Object.values(
    columns
  ).forEach(
    (width) => {
      doc
        .moveTo(
          x,
          rowY
        )
        .lineTo(
          x,
          rowY +
            totalRowHeight
        )
        .stroke();

      x += width;
    }
  );

  doc
    .fontSize(8)
    .font(
      "Helvetica-Bold"
    )
    .text(
      "TOTAL QTY",
      left +
        columns.sr +
        columns.description +
        columns.hsn +
        columns.gst +
        2,
      rowY + 7,
      {
        width:
          columns.qty -
          4,
        align: "center",
      }
    );

  doc.text(
    Number(
      totalQuantity
    ).toFixed(2),
    left +
      columns.sr +
      columns.description +
      columns.hsn +
      columns.gst +
      2 +
      columns.qty,
    rowY + 7,
    {
      width:
        columns.rate -
        4,
      align: "center",
    }
  );

  /*
   * ------------------------------------------------
   * BANK + SUMMARY
   * ------------------------------------------------
   */

  rowY +=
    totalRowHeight +
    20;

  if (
    rowY > 690
  ) {
    doc.addPage();

    rowY = 45;
  }

  const bankX =
    left;

  const summaryX =
    350;

  doc
    .fontSize(10)
    .font(
      "Helvetica-Bold"
    )
    .text(
      "Company Bank Details",
      bankX,
      rowY
    );

  doc
    .fontSize(8)
    .font("Helvetica");

  /*
   * BANK DETAILS
   *
   * Data source:
   * Account collection
   *
   * Fields:
   * bankName
   * accountNumber
   * ifscCode
   * address
   */

  doc.text(
    `Bank Name: ${safeText(
      bankAccount.bankName ||
        bankAccount.name
    )}`,
    bankX,
    rowY + 18
  );

  doc.text(
    `A/C Number: ${safeText(
      bankAccount.accountNumber
    )}`,
    bankX,
    rowY + 33
  );

  doc.text(
    `IFSC Code: ${safeText(
      bankAccount.ifscCode
    )}`,
    bankX,
    rowY + 48
  );

  doc.text(
    `Bank Address: ${safeText(
      bankAccount.address
    )}`,
    bankX,
    rowY + 63,
    {
      width: 270,
    }
  );

  /*
   * SUMMARY
   */

  doc
    .fontSize(10)
    .font(
      "Helvetica-Bold"
    )
    .text(
      "Invoice Summary",
      summaryX,
      rowY
    );

  const summary = [
    [
      "Sub Total",
      sale.productAmount,
    ],

    [
      "Discount",
      sale.discountAmount,
    ],

    [
      "Taxable Amount",
      sale.taxableAmount,
    ],

    [
      "CGST",
      sale.cgstAmount,
    ],

    [
      "SGST",
      sale.sgstAmount,
    ],

    [
      "IGST",
      sale.igstAmount,
    ],

    [
      "Transport",
      sale.transportAmount,
    ],

    [
      "Labour",
      sale.labourAmount,
    ],

    [
      "Round Off",
      sale.roundOff,
    ],

    [
      "Total Amount",
      sale.totalAmount,
    ],
  ];

  let summaryY =
    rowY + 18;

  summary.forEach(
    ([
      label,
      value,
    ]) => {
      if (
        Number(value || 0) !==
          0 ||
        label ===
          "Sub Total" ||
        label ===
          "Taxable Amount" ||
        label ===
          "Total Amount"
      ) {
        doc
          .fontSize(
            label ===
              "Total Amount"
              ? 9
              : 8
          )
          .font(
            label ===
              "Total Amount"
              ? "Helvetica-Bold"
              : "Helvetica"
          )
          .text(
            label,
            summaryX,
            summaryY
          );

        doc.text(
          money(value),
          465,
          summaryY,
          {
            width: 95,
            align: "right",
          }
        );

        summaryY +=
          15;
      }
    }
  );

  /*
   * ------------------------------------------------
   * AMOUNT IN WORDS
   * ------------------------------------------------
   */

  const wordsY =
    Math.max(
      summaryY,
      rowY + 100
    ) + 10;

  doc
    .fontSize(9)
    .font(
      "Helvetica-Bold"
    )
    .text(
      "Amount in Words:",
      left,
      wordsY
    );

  doc
    .font("Helvetica")
    .text(
      numberToWords(
        sale.totalAmount
      ),
      left + 85,
      wordsY,
      {
        width:
          contentWidth -
          85,
      }
    );

  /*
   * ------------------------------------------------
   * NARRATION + TERMS
   * ------------------------------------------------
   */

  let footerY =
    wordsY + 35;

  if (
    sale.narration
  ) {
    doc
      .fontSize(9)
      .font(
        "Helvetica-Bold"
      )
      .text(
        "Narration:",
        left,
        footerY
      );

    doc
      .font("Helvetica")
      .text(
        sale.narration,
        left + 60,
        footerY,
        {
          width:
            contentWidth -
            60,
        }
      );

    footerY +=
      25;
  }

  if (
    sale.termsAndConditions
  ) {
    doc
      .fontSize(9)
      .font(
        "Helvetica-Bold"
      )
      .text(
        "Terms & Conditions:",
        left,
        footerY
      );

    doc
      .font("Helvetica")
      .text(
        sale.termsAndConditions,
        left + 105,
        footerY,
        {
          width:
            contentWidth -
            105,
        }
      );

    footerY +=
      35;
  }

  /*
   * ------------------------------------------------
   * AUTHORISED SIGNATORY
   * ------------------------------------------------
   */

  const signatoryY =
    Math.max(
      footerY,
      690
    );

  doc
    .fontSize(9)
    .font(
      "Helvetica-Bold"
    )
    .text(
      "For " +
        safeText(
          company.companyName,
          "Business Bill"
        ),
      390,
      signatoryY,
      {
        width: 165,
        align: "center",
      }
    );

  doc
    .rect(
      390,
      signatoryY + 20,
      165,
      55
    )
    .stroke();

  doc
    .fontSize(8)
    .font("Helvetica")
    .text(
      "Authorised Signatory",
      390,
      signatoryY + 82,
      {
        width: 165,
        align: "center",
      }
    );

  /*
   * ------------------------------------------------
   * FOOTER
   * ------------------------------------------------
   */

  doc
    .fontSize(7)
    .font("Helvetica")
    .text(
      "This is a computer-generated invoice.",
      left,
      805,
      {
        width:
          contentWidth,
        align: "center",
      }
    );

  doc.end();
};

module.exports = {
  generateSaleInvoicePdf,
};