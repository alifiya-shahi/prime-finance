export const formatCurrency = (value, maxFractionDigits = 0, currencyCode = "INR") =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: currencyCode,
    maximumFractionDigits: maxFractionDigits
  }).format(Number(value || 0));
