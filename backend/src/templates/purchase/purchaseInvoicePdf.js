const PDFDocument = require("pdfkit");

const money = (value) =>
  `Rs. ${Number(value || 0).toFixed(2)}`;

const formatDate = (value) => {
  if (!value) {
    return "-";
  }

  return new Date(
    value
  ).toLocaleDateString(
    "en-IN"
  );
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

const generatePurchaseInvoicePdf = (
  purchase,
  stream
) => {
  const doc =
    new PDFDocument({
      size: "A4",
      margin: 35,
    });

  doc.pipe(stream);

  const left = 35;
  const right = 560;
  const width =
    right - left;

  const company =
    purchase.company || {};

  const supplier =
    purchase.supplier || {};

  const branch =
    purchase.branch || {};

  const bankAccount =
    purchase.bankAccount ||
    purchase.paymentAccount ||
    {};

  /*
   * ==================================================
   * COMPANY HEADER
   * ==================================================
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
        width,
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
        width,
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
        width,
        align: "center",
      }
    );
  }

  const mobile =
    company.mobile ||
    company.phone ||
    "";

  const email =
    company.email || "";

  if (
    mobile ||
    email
  ) {
    doc.text(
      [
        mobile
          ? `Mobile: ${mobile}`
          : "",

        email
          ? `Email: ${email}`
          : "",
      ]
        .filter(Boolean)
        .join(" | "),
      left,
      86,
      {
        width,
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
        width,
        align: "center",
      }
    );
  }

  doc
    .moveTo(left, 118)
    .lineTo(right, 118)
    .stroke();

  doc
    .fontSize(15)
    .font(
      "Helvetica-Bold"
    )
    .text(
      "PURCHASE INVOICE",
      left,
      130,
      {
        width,
        align: "center",
      }
    );

  /*
   * ==================================================
   * SUPPLIER DETAILS
   * ==================================================
   */

  const detailY = 165;

  doc
    .fontSize(9)
    .font(
      "Helvetica-Bold"
    )
    .text(
      "SUPPLIER",
      left,
      detailY
    );

  doc
    .font("Helvetica")
    .text(
      safeText(
        supplier.name
      ),
      left,
      detailY + 15
    );

  if (
    supplier.address
  ) {
    doc.text(
      `Address: ${supplier.address}`,
      left,
      detailY + 30,
      {
        width: 250,
      }
    );
  }

  const supplierLocation =
    [
      supplier.city,
      supplier.state,
      supplier.pincode,
    ]
      .filter(Boolean)
      .join(", ");

  if (
    supplierLocation
  ) {
    doc.text(
      `Location: ${supplierLocation}`,
      left,
      detailY + 45,
      {
        width: 250,
      }
    );
  }

  if (
    supplier.phone
  ) {
    doc.text(
      `Mobile: ${supplier.phone}`,
      left,
      detailY + 60
    );
  }

  if (
    supplier.email
  ) {
    doc.text(
      `Email: ${supplier.email}`,
      left,
      detailY + 75
    );
  }

  if (
    supplier.gstNumber
  ) {
    doc.text(
      `GSTIN: ${supplier.gstNumber}`,
      left,
      detailY + 90
    );
  }

  /*
   * ==================================================
   * PURCHASE DETAILS
   * ==================================================
   */

  const rightX = 350;

  doc
    .font(
      "Helvetica-Bold"
    )
    .text(
      "Purchase Details",
      rightX,
      detailY
    );

  doc
    .font("Helvetica")
    .text(
      `Invoice No.: ${safeText(
        purchase.invoiceNumber
      )}`,
      rightX,
      detailY + 17
    );

  doc.text(
    `Invoice Date: ${formatDate(
      purchase.invoiceDate
    )}`,
    rightX,
    detailY + 32
  );

  doc.text(
    `Invoice Type: ${safeText(
      purchase.invoiceType
    ).toUpperCase()}`,
    rightX,
    detailY + 47
  );

  if (
    branch.branchName
  ) {
    doc.text(
      `Branch: ${branch.branchName}`,
      rightX,
      detailY + 62
    );
  }

  /*
   * ==================================================
   * PRODUCT TABLE
   * ==================================================
   */

  const columns = {
    sr: 35,
    description: 135,
    hsn: 60,
    gst: 40,
    qty: 45,
    rate: 65,
    discount: 55,
    total: 90,
  };

  let tableY = 285;

  const drawTableHeader = (
    y
  ) => {
    doc
      .fontSize(8)
      .font(
        "Helvetica-Bold"
      );

    doc
      .rect(
        left,
        y,
        width,
        25
      )
      .stroke();

    let x = left;

    Object.values(
      columns
    ).forEach(
      (columnWidth) => {
        doc
          .moveTo(
            x,
            y
          )
          .lineTo(
            x,
            y + 25
          )
          .stroke();

        x += columnWidth;
      }
    );

    doc
      .moveTo(
        x,
        y
      )
      .lineTo(
        x,
        y + 25
      )
      .stroke();

    const headers = [
      [
        "sr",
        "SR.",
      ],
      [
        "description",
        "Description",
      ],
      [
        "hsn",
        "HSN/SAC",
      ],
      [
        "gst",
        "GST %",
      ],
      [
        "qty",
        "Qty",
      ],
      [
        "rate",
        "Rate",
      ],
      [
        "discount",
        "Disc. %",
      ],
      [
        "total",
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
          y + 8,
          {
            width:
              columns[key] -
              4,
            align:
              "center",
          }
        );

        x +=
          columns[key];
      }
    );
  };

  drawTableHeader(
    tableY
  );

  let rowY =
    tableY + 25;

  let totalQuantity = 0;

  const items =
    purchase.items || [];

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

        rowY = 45;

        doc
          .fontSize(8)
          .font(
            "Helvetica-Bold"
          )
          .text(
            "PURCHASE INVOICE - CONTINUED",
            left,
            rowY
          );

        rowY += 25;

        drawTableHeader(
          rowY
        );

        rowY += 25;
      }

      doc
        .rect(
          left,
          rowY,
          width,
          rowHeight
        )
        .stroke();

      let x = left;

      Object.values(
        columns
      ).forEach(
        (columnWidth) => {
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

          x += columnWidth;
        }
      );

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
          item.gstRate || 0
        ).toFixed(2);

      const quantity =
        Number(
          item.quantity || 0
        ).toFixed(2);

      const rate =
        money(item.rate);

      const discount =
        Number(
          item.discountPercent ||
            0
        ).toFixed(2);

      const total =
        money(
          item.invoiceAmount ||
            item.amount
        );

      totalQuantity +=
        Number(
          item.quantity || 0
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
          "total",
          total,
        ],
      ];

      x = left;

      doc
        .fontSize(7)
        .font("Helvetica");

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
   * ==================================================
   * TOTAL QUANTITY
   * ==================================================
   */

  const totalHeight =
    25;

  doc
    .rect(
      left,
      rowY,
      width,
      totalHeight
    )
    .stroke();

  let totalX =
    left;

  Object.values(
    columns
  ).forEach(
    (columnWidth) => {
      doc
        .moveTo(
          totalX,
          rowY
        )
        .lineTo(
          totalX,
          rowY +
            totalHeight
        )
        .stroke();

      totalX +=
        columnWidth;
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
        columns.gst,
      rowY + 7,
      {
        width:
          columns.qty,
        align:
          "center",
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
      columns.qty,
    rowY + 7,
    {
      width:
        columns.rate,
      align:
        "center",
    }
  );

  /*
   * ==================================================
   * BANK DETAILS
   * ==================================================
   */

  rowY +=
    totalHeight +
    20;

  if (
    rowY > 690
  ) {
    doc.addPage();
    rowY = 45;
  }

  doc
    .fontSize(10)
    .font(
      "Helvetica-Bold"
    )
    .text(
      "Company Bank Details",
      left,
      rowY
    );

  doc
    .fontSize(8)
    .font("Helvetica");

  doc.text(
    `Bank Name: ${safeText(
      bankAccount.bankName ||
        bankAccount.name
    )}`,
    left,
    rowY + 18
  );

  doc.text(
    `A/C Number: ${safeText(
      bankAccount.accountNumber
    )}`,
    left,
    rowY + 33
  );

  doc.text(
    `IFSC Code: ${safeText(
      bankAccount.ifscCode
    )}`,
    left,
    rowY + 48
  );

  doc.text(
    `Bank Address: ${safeText(
      bankAccount.address
    )}`,
    left,
    rowY + 63,
    {
      width: 270,
    }
  );

  /*
   * ==================================================
   * PURCHASE SUMMARY
   * ==================================================
   */

  const summaryX =
    350;

  doc
    .fontSize(10)
    .font(
      "Helvetica-Bold"
    )
    .text(
      "Purchase Summary",
      summaryX,
      rowY
    );

  const summary = [
    [
      "Sub Total",
      purchase.productAmount,
    ],
    [
      "Discount",
      purchase.discountAmount,
    ],
    [
      "Taxable Amount",
      purchase.taxableAmount,
    ],
    [
      "CGST",
      purchase.cgstAmount,
    ],
    [
      "SGST",
      purchase.sgstAmount,
    ],
    [
      "IGST",
      purchase.igstAmount,
    ],
    [
      "Transport",
      purchase.transportAmount,
    ],
    [
      "Labour",
      purchase.labourAmount,
    ],
    [
      "Round Off",
      purchase.roundOff,
    ],
    [
      "Total Amount",
      purchase.totalAmount,
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
   * ==================================================
   * AMOUNT IN WORDS
   * ==================================================
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
        purchase.totalAmount
      ),
      left + 85,
      wordsY,
      {
        width:
          width - 85,
      }
    );

  /*
   * ==================================================
   * NARRATION
   * ==================================================
   */

  let footerY =
    wordsY + 35;

  if (
    purchase.narration
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
        purchase.narration,
        left + 60,
        footerY,
        {
          width:
            width - 60,
        }
      );

    footerY +=
      25;
  }

  /*
   * ==================================================
   * TERMS AND CONDITIONS
   * ==================================================
   */

  if (
    purchase.termsAndConditions
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
        purchase.termsAndConditions,
        left + 105,
        footerY,
        {
          width:
            width - 105,
        }
      );

    footerY +=
      35;
  }

  /*
   * ==================================================
   * AUTHORISED SIGNATORY
   * ==================================================
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
      `For ${safeText(
        company.companyName,
        "Business Bill"
      )}`,
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
   * ==================================================
   * FOOTER
   * ==================================================
   */

  doc
    .fontSize(7)
    .font("Helvetica")
    .text(
      "This is a computer-generated purchase invoice.",
      left,
      805,
      {
        width,
        align: "center",
      }
    );

  doc.end();
};

module.exports = {
  generatePurchaseInvoicePdf,
};