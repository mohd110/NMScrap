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

// Wholesale cost of the goods sold in a bazaar (qty_sold × unit_price).
export function bazaarCost(items = []) {
  return items.reduce((s, it) => s + (Number(it.qty_sold) || 0) * (Number(it.unit_price) || 0), 0);
}

// Revenue / cost / profit for a whole bazaar.
// Revenue = the single total amount received for the bazaar (set at close).
// Cost    = wholesale cost of goods sold. Profit = revenue − cost.
// Legacy bazaars closed before amounts were captured (amount_received = 0
// with items sold) fall back to cost, so profit reads 0 not a false loss.
export function bazaarTotals(bazaar = {}) {
  const items = bazaar.items || [];
  const cost = bazaarCost(items);
  const received = Number(bazaar.amount_received) || 0;
  const soldUnits = items.reduce((s, it) => s + (Number(it.qty_sold) || 0), 0);
  const revenue = received > 0 || soldUnits === 0 ? received : cost;
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
