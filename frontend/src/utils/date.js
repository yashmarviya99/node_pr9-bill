export const formatDate = (date) => {
  if (!date) return "";
  const d = new Date(date);
  if (isNaN(d.getTime())) return "";
  const day = String(d.getDate()).padStart(2, "0");
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const year = d.getFullYear();
  return `${day}-${month}-${year}`;
};

export const formatISODate = (date) => {
  if (!date) return "";
  const d = new Date(date);
  if (isNaN(d.getTime())) return "";
  return d.toISOString().split("T")[0];
};

export const isDateInFinancialYear = (dateStr, fy) => {
  if (!fy || !dateStr) return true;
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return false;
  
  if (fy.startDate && fy.endDate) {
    const start = new Date(fy.startDate);
    const end = new Date(fy.endDate);
    return d >= start && d <= end;
  }
  return true;
};
