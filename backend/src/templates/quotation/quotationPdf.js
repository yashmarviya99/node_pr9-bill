const PDFDocument = require("pdfkit");

const money = (value) =>
  `Rs. ${Number(value || 0).toFixed(2)}`;

const generateQuotationPdf = (
  quotation,
  stream
) => {
  const doc = new PDFDocument({
    margin: 40,
    size: "A4",
  });

  doc.pipe(stream);

  const company =
    quotation.company || {};

  const customer =
    quotation.customer || {};

  doc
    .fontSize(20)
    .text(
      company.companyName ||
        "Business Bill",
      {
        align: "center",
      }
    );

  doc
    .fontSize(16)
    .text("QUOTATION", {
      align: "center",
    });

  doc.moveDown();

  doc.fontSize(10);

  doc.text(
    `Quotation No: ${quotation.quotationNumber}`
  );

  doc.text(
    `Quotation Date: ${new Date(
      quotation.quotationDate
    ).toLocaleDateString("en-IN")}`
  );

  if (quotation.validUntil) {
    doc.text(
      `Valid Until: ${new Date(
        quotation.validUntil
      ).toLocaleDateString("en-IN")}`
    );
  }

  doc.moveDown();

  doc.text(
    `Customer: ${
      customer.name ||
      "Walk-in Customer"
    }`
  );

  if (customer.phone) {
    doc.text(
      `Phone: ${customer.phone}`
    );
  }

  if (customer.email) {
    doc.text(
      `Email: ${customer.email}`
    );
  }

  if (customer.address) {
    doc.text(
      `Address: ${customer.address}`
    );
  }

  doc.moveDown();

  doc
    .fontSize(9)
    .text(
      "#   Product                         Qty       Rate          Amount"
    );

  doc
    .moveTo(40, doc.y + 3)
    .lineTo(555, doc.y + 3)
    .stroke();

  doc.moveDown(0.5);

  quotation.items.forEach(
    (item, index) => {
      doc.text(
        `${index + 1}   ${String(
          item.productName
        )
          .slice(0, 28)
          .padEnd(
            30
          )} ${String(
          item.quantity
        ).padStart(
          5
        )}   ${money(
          item.rate
        ).padStart(
          12
        )}   ${money(
          item.totalAmount
        ).padStart(
          14
        )}`
      );
    }
  );

  doc.moveDown();

  doc.text(
    `Product Amount: ${money(
      quotation.productAmount
    )}`,
    {
      align: "right",
    }
  );

  doc.text(
    `Discount: ${money(
      quotation.discountAmount
    )}`,
    {
      align: "right",
    }
  );

  doc.text(
    `Taxable Amount: ${money(
      quotation.taxableAmount
    )}`,
    {
      align: "right",
    }
  );

  if (quotation.cgstAmount) {
    doc.text(
      `CGST: ${money(
        quotation.cgstAmount
      )}`,
      {
        align: "right",
      }
    );
  }

  if (quotation.sgstAmount) {
    doc.text(
      `SGST: ${money(
        quotation.sgstAmount
      )}`,
      {
        align: "right",
      }
    );
  }

  if (quotation.igstAmount) {
    doc.text(
      `IGST: ${money(
        quotation.igstAmount
      )}`,
      {
        align: "right",
      }
    );
  }

  if (quotation.transportAmount) {
    doc.text(
      `Transport: ${money(
        quotation.transportAmount
      )}`,
      {
        align: "right",
      }
    );
  }

  if (quotation.labourAmount) {
    doc.text(
      `Labour: ${money(
        quotation.labourAmount
      )}`,
      {
        align: "right",
      }
    );
  }

  doc
    .fontSize(12)
    .text(
      `TOTAL: ${money(
        quotation.totalAmount
      )}`,
      {
        align: "right",
      }
    );

  doc.fontSize(9);

  if (quotation.narration) {
    doc.moveDown();

    doc.text(
      `Narration: ${quotation.narration}`
    );
  }

  if (
    quotation.termsAndConditions
  ) {
    doc.moveDown();

    doc.text(
      `Terms & Conditions: ${quotation.termsAndConditions}`
    );
  }

  if (quotation.notes) {
    doc.moveDown();

    doc.text(
      `Notes: ${quotation.notes}`
    );
  }

  doc
    .moveDown(2)
    .text(
      "This quotation is for reference and does not create a payment or stock transaction.",
      {
        align: "center",
      }
    );

  doc.end();
};

module.exports = {
  generateQuotationPdf,
};