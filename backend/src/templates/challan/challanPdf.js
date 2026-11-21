const PDFDocument = require("pdfkit");

const safeText = (value) => {
  if (
    value === undefined ||
    value === null ||
    value === ""
  ) {
    return "-";
  }

  return String(value);
};

const money = (value) => {
  const number = Number(value || 0);

  return number.toLocaleString("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
};

const formatDate = (date) => {
  if (!date) {
    return "-";
  }

  const parsedDate = new Date(date);

  if (Number.isNaN(parsedDate.getTime())) {
    return "-";
  }

  return parsedDate.toLocaleDateString("en-IN");
};

const getAddress = (data) => {
  if (!data) {
    return "-";
  }

  const parts = [
    data.address,
    data.addressLine1,
    data.addressLine2,
    data.city,
    data.state,
    data.pincode,
  ].filter(Boolean);

  return parts.length
    ? parts.join(", ")
    : "-";
};

const getCompanyName = (company) => {
  return (
    company?.name ||
    company?.companyName ||
    company?.businessName ||
    "Company"
  );
};

const drawTableHeader = (doc, y) => {
  const columns = [
    {
      x: 35,
      width: 30,
      title: "SR",
    },
    {
      x: 65,
      width: 145,
      title: "PRODUCT / DESCRIPTION",
    },
    {
      x: 210,
      width: 65,
      title: "HSN/SAC",
    },
    {
      x: 275,
      width: 45,
      title: "UOM",
    },
    {
      x: 320,
      width: 50,
      title: "QTY",
    },
    {
      x: 370,
      width: 75,
      title: "RATE",
    },
    {
      x: 445,
      width: 115,
      title: "AMOUNT",
    },
  ];

  doc
    .rect(35, y, 525, 28)
    .fillAndStroke(
      "#eeeeee",
      "#444444"
    );

  doc.fillColor("#000000");

  columns.forEach((column) => {
    doc
      .font("Helvetica-Bold")
      .fontSize(7)
      .text(
        column.title,
        column.x + 2,
        y + 9,
        {
          width:
            column.width - 4,
          align:
            column.title ===
            "PRODUCT / DESCRIPTION"
              ? "left"
              : "center",
        }
      );
  });

  return columns;
};

const generateChallanPdf = (
  challan,
  responseStream
) => {
  const doc = new PDFDocument({
    size: "A4",
    margin: 35,
  });

  doc.pipe(responseStream);

  const company =
    challan.company || {};

  const branch =
    challan.branch || {};

  const customer =
    challan.customer || {};

  const account =
    challan.account || {};

  /*
   * Company Header
   */

  const companyName =
    getCompanyName(company);

  doc
    .font("Helvetica-Bold")
    .fontSize(18)
    .text(
      companyName,
      35,
      35,
      {
        width: 525,
        align: "center",
      }
    );

  doc
    .font("Helvetica")
    .fontSize(9)
    .text(
      getAddress(company),
      35,
      60,
      {
        width: 525,
        align: "center",
      }
    );

  if (company.phone) {
    doc.text(
      `Phone: ${safeText(
        company.phone
      )}`,
      35,
      75,
      {
        width: 525,
        align: "center",
      }
    );
  }

  if (company.email) {
    doc.text(
      `Email: ${safeText(
        company.email
      )}`,
      35,
      89,
      {
        width: 525,
        align: "center",
      }
    );
  }

  if (
    company.gstNumber ||
    company.gstin
  ) {
    doc.text(
      `GSTIN: ${safeText(
        company.gstNumber ||
          company.gstin
      )}`,
      35,
      103,
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

  /*
   * Title
   */

  doc
    .font("Helvetica-Bold")
    .fontSize(16)
    .text(
      "DELIVERY CHALLAN",
      35,
      132,
      {
        width: 525,
        align: "center",
      }
    );

  if (challan.challanType) {
    doc
      .font("Helvetica")
      .fontSize(9)
      .text(
        `Type: ${safeText(
          challan.challanType
        )}`,
        35,
        155,
        {
          width: 525,
          align: "center",
        }
      );
  }

  /*
   * Challan Details
   */

  const detailsY = 180;

  doc
    .rect(
      35,
      detailsY,
      525,
      100
    )
    .stroke();

  doc
    .font("Helvetica-Bold")
    .fontSize(9)
    .text(
      "Challan No.",
      45,
      detailsY + 15
    );

  doc
    .font("Helvetica")
    .text(
      safeText(
        challan.challanNumber
      ),
      125,
      detailsY + 15
    );

  doc
    .font("Helvetica-Bold")
    .text(
      "Challan Date",
      45,
      detailsY + 38
    );

  doc
    .font("Helvetica")
    .text(
      formatDate(
        challan.challanDate
      ),
      125,
      detailsY + 38
    );

  doc
    .font("Helvetica-Bold")
    .text(
      "Reference No.",
      45,
      detailsY + 61
    );

  doc
    .font("Helvetica")
    .text(
      safeText(
        challan.referenceNumber
      ),
      125,
      detailsY + 61
    );

  doc
    .font("Helvetica-Bold")
    .text(
      "Branch",
      45,
      detailsY + 84
    );

  doc
    .font("Helvetica")
    .text(
      branch?.name ||
        branch?.branchName ||
        "-",
      125,
      detailsY + 84
    );

  doc
    .font("Helvetica-Bold")
    .text(
      "Vehicle No.",
      300,
      detailsY + 15
    );

  doc
    .font("Helvetica")
    .text(
      safeText(
        challan.vehicleNumber
      ),
      380,
      detailsY + 15
    );

  doc
    .font("Helvetica-Bold")
    .text(
      "Transporter",
      300,
      detailsY + 38
    );

  doc
    .font("Helvetica")
    .text(
      safeText(
        challan.transporterName
      ),
      380,
      detailsY + 38
    );

  doc
    .font("Helvetica-Bold")
    .text(
      "E-Way Bill No.",
      300,
      detailsY + 61
    );

  doc
    .font("Helvetica")
    .text(
      safeText(
        challan.eWayBillNumber
      ),
      380,
      detailsY + 61
    );

  doc
    .font("Helvetica-Bold")
    .text(
      "Account",
      300,
      detailsY + 84
    );

  doc
    .font("Helvetica")
    .text(
      safeText(account.name),
      380,
      detailsY + 84
    );

  /*
   * Customer Details
   */

  const customerY = 300;

  doc
    .rect(
      35,
      customerY,
      525,
      78
    )
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
    .text(
      "Name:",
      45,
      customerY + 32
    );

  doc
    .font("Helvetica")
    .text(
      customer?.name ||
        customer?.customerName ||
        "-",
      90,
      customerY + 32
    );

  doc
    .font("Helvetica-Bold")
    .text(
      "Phone:",
      300,
      customerY + 32
    );

  doc
    .font("Helvetica")
    .text(
      safeText(customer.phone),
      350,
      customerY + 32
    );

  doc
    .font("Helvetica-Bold")
    .text(
      "Email:",
      45,
      customerY + 55
    );

  doc
    .font("Helvetica")
    .text(
      safeText(customer.email),
      90,
      customerY + 55,
      {
        width: 180,
      }
    );

  doc
    .font("Helvetica-Bold")
    .text(
      "Address:",
      300,
      customerY + 55
    );

  doc
    .font("Helvetica")
    .text(
      getAddress(customer),
      350,
      customerY + 55,
      {
        width: 195,
      }
    );

  /*
   * Items
   */

  let y = 405;

  const columns =
    drawTableHeader(doc, y);

  y += 28;

  const items =
    Array.isArray(challan.items)
      ? challan.items
      : [];

  items.forEach(
    (item, index) => {
      const rowHeight = 35;

      if (y + rowHeight > 720) {
        doc.addPage();

        y = 40;

        drawTableHeader(
          doc,
          y
        );

        y += 28;
      }

      doc
        .rect(
          35,
          y,
          525,
          rowHeight
        )
        .stroke();

      const product =
        item.product || {};

      const productName =
        item.productName ||
        product.name ||
        "-";

      const description =
        item.description || "";

      const productText =
        description
          ? `${productName}\n${description}`
          : productName;

      const values = [
        index + 1,
        productText,
        item.hsnSac ||
          product.hsnSac ||
          "-",
        item.uom ||
          product.uom ||
          "-",
        item.quantity || 0,
        money(item.rate),
        money(item.amount),
      ];

      values.forEach(
        (
          value,
          valueIndex
        ) => {
          const column =
            columns[valueIndex];

          doc
            .font("Helvetica")
            .fontSize(7)
            .text(
              safeText(value),
              column.x + 2,
              y + 8,
              {
                width:
                  column.width - 4,
                height:
                  rowHeight - 4,
                align:
                  valueIndex === 1
                    ? "left"
                    : "center",
              }
            );
        }
      );

      y += rowHeight;
    }
  );

  /*
   * Summary
   */

  y += 18;

  if (y > 650) {
    doc.addPage();
    y = 50;
  }

  doc
    .font("Helvetica-Bold")
    .fontSize(10)
    .text(
      "CHALLAN SUMMARY",
      35,
      y
    );

  y += 22;

  doc
    .font("Helvetica")
    .fontSize(9)
    .text(
      "Total Quantity",
      370,
      y,
      {
        width: 120,
        align: "right",
      }
    );

  doc
    .font("Helvetica-Bold")
    .text(
      safeText(
        challan.totalQuantity
      ),
      495,
      y,
      {
        width: 65,
        align: "right",
      }
    );

  y += 20;

  doc
    .font("Helvetica")
    .text(
      "Total Amount",
      370,
      y,
      {
        width: 120,
        align: "right",
      }
    );

  doc
    .font("Helvetica-Bold")
    .text(
      `₹ ${money(
        challan.totalAmount
      )}`,
      475,
      y,
      {
        width: 85,
        align: "right",
      }
    );

  /*
   * Narration
   */

  if (challan.narration) {
    y += 35;

    doc
      .font("Helvetica-Bold")
      .fontSize(9)
      .text(
        "Narration:",
        35,
        y
      );

    doc
      .font("Helvetica")
      .text(
        safeText(
          challan.narration
        ),
        95,
        y,
        {
          width: 460,
        }
      );
  }

  /*
   * Terms
   */

  if (
    challan.termsAndConditions
  ) {
    y += 35;

    doc
      .font("Helvetica-Bold")
      .fontSize(9)
      .text(
        "Terms & Conditions:",
        35,
        y
      );

    y += 17;

    doc
      .font("Helvetica")
      .fontSize(8)
      .text(
        safeText(
          challan.termsAndConditions
        ),
        35,
        y,
        {
          width: 525,
        }
      );
  }

  /*
   * Note
   */

  y += 40;

  doc
    .font("Helvetica")
    .fontSize(8)
    .text(
      "Note: This challan is a delivery document and does not affect stock.",
      35,
      y,
      {
        width: 525,
      }
    );

  /*
   * Signature
   */

  const signatureY = 735;

  doc
    .moveTo(
      420,
      signatureY - 10
    )
    .lineTo(
      550,
      signatureY - 10
    )
    .stroke();

  doc
    .font("Helvetica")
    .fontSize(9)
    .text(
      "Authorised Signatory",
      420,
      signatureY,
      {
        width: 130,
        align: "center",
      }
    );

  /*
   * Footer
   */

  doc
    .font("Helvetica")
    .fontSize(8)
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
  generateChallanPdf,
};