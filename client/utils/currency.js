/**
 * Форматирует валюту для отображения
 * USD -> "$"
 * UZS, so'm, или пустое -> "so'm"
 */
export const formatCurrency = (currency) => {
  if (!currency) return "so'm";
  const upper = currency.toUpperCase();
  if (upper === "USD" || upper === "$") return "$";
  return "so'm";
};

/**
 * Форматирует цену с валютой
 * @param {number} price - цена
 * @param {string} currency - валюта (USD, UZS, so'm)
 * @returns {string} - отформатированная строка
 */
export const formatPrice = (price, currency) => {
  const formattedPrice = new Intl.NumberFormat("uz-UZ").format(Number(price || 0));
  const currencySymbol = formatCurrency(currency);
  
  // Для доллара символ ставим перед ценой
  if (currencySymbol === "$") {
    return `$${formattedPrice}`;
  }
  
  return `${formattedPrice} ${currencySymbol}`;
};
