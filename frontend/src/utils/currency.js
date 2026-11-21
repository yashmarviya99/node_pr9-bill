export const formatCurrency = (amount) => {
  const num = Number(amount || 0);
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(num);
};

export const formatNumber = (num, decimals = 2) => {
  const n = Number(num || 0);
  return new Intl.NumberFormat("en-IN", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(n);
};

const ones = [
  "", "One", "Two", "Three", "Four", "Five", "Six", "Seven", "Eight", "Nine",
  "Ten", "Eleven", "Twelve", "Thirteen", "Fourteen", "Fifteen", "Sixteen",
  "Seventeen", "Eighteen", "Nineteen",
];

const tens = [
  "", "", "Twenty", "Thirty", "Forty", "Fifty", "Sixty", "Seventy", "Eighty", "Ninety",
];

const convertLessThanThousand = (n) => {
  if (n === 0) return "";
  if (n < 20) return ones[n] + " ";
  if (n < 100) return tens[Math.floor(n / 10)] + " " + (n % 10 !== 0 ? ones[n % 10] + " " : "");
  return (
    ones[Math.floor(n / 100)] +
    " Hundred " +
    (n % 100 !== 0 ? "and " + convertLessThanThousand(n % 100) : "")
  );
};

export const amountToWords = (amount) => {
  const num = Math.floor(Number(amount || 0));
  if (num === 0) return "Zero Rupees Only";

  let words = "";

  const crore = Math.floor(num / 10000000);
  let remainder = num % 10000000;

  const lakh = Math.floor(remainder / 100000);
  remainder = remainder % 100000;

  const thousand = Math.floor(remainder / 1000);
  remainder = remainder % 1000;

  if (crore > 0) {
    words += convertLessThanThousand(crore).trim() + " Crore ";
  }
  if (lakh > 0) {
    words += convertLessThanThousand(lakh).trim() + " Lakh ";
  }
  if (thousand > 0) {
    words += convertLessThanThousand(thousand).trim() + " Thousand ";
  }
  if (remainder > 0) {
    words += convertLessThanThousand(remainder).trim() + " ";
  }

  const paise = Math.round((Number(amount || 0) - num) * 100);
  let paiseWords = "";
  if (paise > 0) {
    paiseWords = " and " + convertLessThanThousand(paise).trim() + " Paise";
  }

  return (words.trim() + paiseWords + " Rupees Only").replace(/\s+/g, " ");
};
