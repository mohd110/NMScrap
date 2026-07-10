// Small formatting helpers shared across screens.

// Indian-format rupee amount, e.g. 1245800 -> "₹ 12,45,800"
export function inr(n) {
  const value = Number(n) || 0;
  return '₹ ' + value.toLocaleString('en-IN', { maximumFractionDigits: 0 });
}

// Quantity + unit, trimming trailing ".0", e.g. (2.5,'kg') -> "2.5 kg"
export function qty(n, unit = '') {
  const value = Number(n) || 0;
  const num = Number.isInteger(value) ? value : Number(value.toFixed(2));
  return unit ? `${num} ${unit}` : `${num}`;
}

// Value of a stock line (quantity × unit price)
export function lineValue(quantity, unitPrice) {
  return (Number(quantity) || 0) * (Number(unitPrice) || 0);
}

// Selling price captured for a bazaar item at close. Legacy items closed
// before selling prices were captured fall back to the wholesale unit_price
// (so their revenue equals cost and profit reads 0, rather than a false loss).
export function salePriceOf(item) {
  const sp = Number(item.sale_price) || 0;
  return sp > 0 ? sp : (Number(item.unit_price) || 0);
}

// Revenue / cost / profit for a set of bazaar items, based on qty_sold.
// Revenue uses the selling price; cost uses the wholesale unit_price.
export function bazaarTotals(items = []) {
  let revenue = 0, cost = 0;
  for (const it of items) {
    const sold = Number(it.qty_sold) || 0;
    revenue += sold * salePriceOf(it);
    cost += sold * (Number(it.unit_price) || 0);
  }
  return { revenue, cost, profit: revenue - cost };
}

// Relative "time ago" for timestamps
export function timeAgo(ts) {
  if (!ts) return '';
  const then = new Date(ts).getTime();
  const diff = Math.max(0, Date.now() - then);
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins} min ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs} hour${hrs > 1 ? 's' : ''} ago`;
  const days = Math.floor(hrs / 24);
  if (days < 7) return `${days} day${days > 1 ? 's' : ''} ago`;
  return new Date(ts).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
}

// Generate a simple SKU from a product name, e.g. "Copper Wire" -> "NM-COP-8421"
export function makeSku(name = '') {
  const prefix = (name.replace(/[^a-zA-Z]/g, '').slice(0, 3) || 'ITM').toUpperCase();
  const num = Math.floor(1000 + Math.random() * 9000);
  return `NM-${prefix}-${num}`;
}
