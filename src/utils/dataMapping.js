// Map TopUpItem from DB to listDiamond format used in game pages
export const mapGameItems = (items) => {
  if (!items) return [];
  return items.map(item => ({
    qty: item.qty,
    price: item.originalPrice,
    disc: item.discountPercent,
    discPrice: item.finalPrice
  }));
};

// Map payment_methods from DB to listPayment format used in game pages
export const mapPaymentMethods = (methods) => {
  if (!methods) return [];
  return methods.map(method => ({
    name: method.name,
    imgSrc: method.logoUrl
  }));
};
