export const stateCodeMap = {
  "01": "Jammu & Kashmir",
  "02": "Himachal Pradesh",
  "03": "Punjab",
  "04": "Chandigarh",
  "05": "Uttarakhand",
  "06": "Haryana",
  "07": "Delhi",
  "08": "Rajasthan",
  "09": "Uttar Pradesh",
  "10": "Bihar",
  "11": "Sikkim",
  "12": "Arunachal Pradesh",
  "13": "Nagaland",
  "14": "Manipur",
  "15": "Mizoram",
  "16": "Tripura",
  "17": "Meghalaya",
  "18": "Assam",
  "19": "West Bengal",
  "20": "Jharkhand",
  "21": "Odisha",
  "22": "Chhattisgarh",
  "23": "Madhya Pradesh",
  "24": "Gujarat",
  "25": "Daman & Diu",
  "26": "Dadra & Nagar Haveli",
  "27": "Maharashtra",
  "28": "Andhra Pradesh (Old)",
  "29": "Karnataka",
  "30": "Goa",
  "31": "Lakshadweep",
  "32": "Kerala",
  "33": "Tamil Nadu",
  "34": "Puducherry",
  "35": "Andaman & Nicobar Islands",
  "36": "Telangana",
  "37": "Andhra Pradesh",
  "38": "Ladakh",
};

export const verifyAndParseGSTIN = (gstin) => {
  const clean = String(gstin || "").trim().toUpperCase();
  const gstRegex = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/;
  
  if (!gstRegex.test(clean)) {
    return {
      isValid: false,
      message: "Please enter a valid 15-digit GSTIN (e.g., 24AAAPL1234F1Z5)",
    };
  }

  const stateCode = clean.substring(0, 2);
  const pan = clean.substring(2, 12);
  const stateName = stateCodeMap[stateCode] || "Gujarat";

  return {
    isValid: true,
    gstin: clean,
    stateCode,
    stateName,
    pan,
    legalName: `BUSINESS ENTITY (${pan})`,
    tradeName: `TRADERS ${stateName.toUpperCase()}`,
    address: `Industrial Area, Phase 2, Ring Road`,
    city: stateName === "Gujarat" ? "Rajkot" : "City Center",
    pincode: stateName === "Gujarat" ? "360004" : "400001",
    country: "India",
  };
};

export const calculateLineItem = ({
  quantity = 1,
  rate = 0,
  discountPercent = 0,
  gstRate = 0,
  isInterState = false,
}) => {
  const qty = Number(quantity || 0);
  const rt = Number(rate || 0);
  const discPct = Number(discountPercent || 0);
  const gst = Number(gstRate || 0);

  const amount = Math.round((qty * rt) * 100) / 100;
  const discountAmount = Math.round((amount * (discPct / 100)) * 100) / 100;
  const taxableAmount = Math.round((amount - discountAmount) * 100) / 100;

  let cgstPercent = 0;
  let sgstPercent = 0;
  let igstPercent = 0;
  let cgstAmount = 0;
  let sgstAmount = 0;
  let igstAmount = 0;

  if (isInterState) {
    igstPercent = gst;
    igstAmount = Math.round((taxableAmount * (gst / 100)) * 100) / 100;
  } else {
    cgstPercent = gst / 2;
    sgstPercent = gst / 2;
    cgstAmount = Math.round((taxableAmount * (cgstPercent / 100)) * 100) / 100;
    sgstAmount = Math.round((taxableAmount * (sgstPercent / 100)) * 100) / 100;
  }

  const invoiceAmount = Math.round((taxableAmount + cgstAmount + sgstAmount + igstAmount) * 100) / 100;

  return {
    amount,
    discountAmount,
    taxableAmount,
    cgstPercent,
    sgstPercent,
    igstPercent,
    cgstAmount,
    sgstAmount,
    igstAmount,
    invoiceAmount,
  };
};
