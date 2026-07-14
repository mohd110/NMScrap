import { useState, useMemo } from 'react';
import { BackHeader } from './Shared';
import BillReceipt from './BillReceipt';
import { useData } from '../context/DataContext';
import { useNav } from '../context/NavContext';
import { useToast } from '../context/ToastContext';
import { useLang } from '../context/LangContext';
import { inr, qty } from '../lib/format';

const PAYMENTS = [
  { id: 'cash', tkey: 'sell_pay_cash' },
  { id: 'upi', tkey: 'sell_pay_upi' },
  { id: 'credit', tkey: 'sell_pay_credit' },
];

// Turn an inventory product into a fresh cart line.
// sale_price defaults to the wholesale price but is fully editable.
function lineFromProduct(p) {
  return {
    product_id: p.id,
    product_name: p.name,
    sku: p.sku || null,
    unit: p.unit,
    stock: Number(p.quantity) || 0,
    wholesale_price: Number(p.unit_price) || 0,
    quantity: '1',
    sale_price: p.unit_price != null ? String(p.unit_price) : '',
  };
}

export default function SellScreen() {
  const { products, recordSale } = useData();
  const { params, back } = useNav();
  const { notify } = useToast();
  const { t } = useLang();

  const [cart, setCart] = useState(() => {
    const pre = params.productId && products.find((p) => p.id === params.productId);
    return pre ? [lineFromProduct(pre)] : [];
  });
  const [search, setSearch] = useState('');
  const [buyerName, setBuyerName] = useState('');
  const [buyerPhone, setBuyerPhone] = useState('');
  const [paymentMode, setPaymentMode] = useState('cash');
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);
  const [bill, setBill] = useState(null);

  const inCart = (id) => cart.some((l) => l.product_id === id);
  const pickable = products.filter(
    (p) => !inCart(p.id) &&
      `${p.name} ${p.sku || ''}`.toLowerCase().includes(search.toLowerCase())
  );

  const addLine = (p) => {
    setCart((c) => [...c, lineFromProduct(p)]);
    setSearch('');
  };
  const removeLine = (id) => setCart((c) => c.filter((l) => l.product_id !== id));
  const setLine = (id, key, val) =>
    setCart((c) => c.map((l) => (l.product_id === id ? { ...l, [key]: val } : l)));

  const { total, profit } = useMemo(() => {
    let t = 0, k = 0;
    for (const l of cart) {
      const q = Number(l.quantity) || 0;
      t += q * (Number(l.sale_price) || 0);
      k += q * (Number(l.wholesale_price) || 0);
    }
    return { total: t, profit: t - k };
  }, [cart]);

  // Every line needs a positive qty (not exceeding stock) and a price.
  const problems = cart.filter((l) => {
    const q = Number(l.quantity);
    return !(q > 0) || q > l.stock || !(Number(l.sale_price) >= 0) || l.sale_price === '';
  });
  const canSell = cart.length > 0 && problems.length === 0 && !busy;

  const complete = async () => {
    if (!canSell) return;
    setBusy(true);
    try {
      const items = cart.map((l) => ({
        product_id: l.product_id,
        product_name: l.product_name,
        sku: l.sku,
        unit: l.unit,
        quantity: Number(l.quantity) || 0,
        wholesale_price: Number(l.wholesale_price) || 0,
        sale_price: Number(l.sale_price) || 0,
      }));
      const created = await recordSale({
        buyerName: buyerName.trim(),
        buyerPhone: buyerPhone.trim(),
        paymentMode,
        note: note.trim(),
        items,
      });
      setBill(created);
      notify(t('sell_recorded', { no: created.bill_no }));
    } catch (e) {
      notify(e.message || t('sell_failed'), 'error');
    } finally {
      setBusy(false);
    }
  };

  // Once the sale is done, show the printable bill.
  if (bill) {
    return (
      <>
        <BackHeader title={t('rep_bill_title', { no: bill.bill_no })} onBack={back} />
        <div className="screen-content">
          <BillReceipt bill={bill} onClose={back} />
        </div>
      </>
    );
  }

  return (
    <>
      <BackHeader title={t('sell_title')} onBack={back} />

      <div className="screen-content">
        <div className="sell-screen">

          {/* ---- product picker ---- */}
          <div className="inv-search-wrap">
            <span className="inv-search-icon">🔍</span>
            <input
              className="inv-search-input"
              placeholder={t('sell_add_product_ph')}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          {search && (
            <div className="sell-picker">
              {pickable.length === 0 && <div className="empty-hint">{t('sell_no_match')}</div>}
              {pickable.slice(0, 6).map((p) => (
                <div key={p.id} className="sell-pick-row" onClick={() => addLine(p)}>
                  <div>
                    <div className="sell-pick-name">{p.name}</div>
                    <div className="sell-pick-sub">{t('sell_in_stock_wholesale', { qty: qty(p.quantity, p.unit), price: inr(p.unit_price) })}</div>
                  </div>
                  <span className="sell-pick-add">＋</span>
                </div>
              ))}
            </div>
          )}

          {/* ---- cart lines ---- */}
          <div className="section-title" style={{ margin: '4px 0 8px' }}>{t('sell_items', { n: cart.length })}</div>
          {cart.length === 0 && (
            <div className="empty-hint">{t('sell_search_hint')}</div>
          )}

          <div className="sell-lines">
            {cart.map((l) => {
              const q = Number(l.quantity) || 0;
              const over = q > l.stock;
              const lineTotal = q * (Number(l.sale_price) || 0);
              return (
                <div key={l.product_id} className="sell-line">
                  <div className="sell-line-top">
                    <div className="sell-line-name">{l.product_name}</div>
                    <button className="inv-del-btn" onClick={() => removeLine(l.product_id)} title={t('remove')}>🗑</button>
                  </div>
                  <div className="sell-line-inputs">
                    <label className="sell-field">
                      <span>{t('sell_qty', { unit: l.unit })}</span>
                      <input className="form-input" type="number" value={l.quantity}
                             onChange={(e) => setLine(l.product_id, 'quantity', e.target.value)} />
                    </label>
                    <label className="sell-field">
                      <span>{t('sell_sell_price', { unit: l.unit })}</span>
                      <input className="form-input" type="number" value={l.sale_price}
                             onChange={(e) => setLine(l.product_id, 'sale_price', e.target.value)} />
                    </label>
                    <div className="sell-field">
                      <span>{t('sell_amount')}</span>
                      <div className="sell-line-amt">{inr(lineTotal)}</div>
                    </div>
                  </div>
                  <div className="sell-line-hint">
                    {over
                      ? <span className="sell-warn">{t('sell_only_in_stock', { qty: qty(l.stock, l.unit) })}</span>
                      : <span>{t('sell_wholesale_line', { price: inr(l.wholesale_price), unit: l.unit, qty: qty(l.stock, l.unit) })}</span>}
                  </div>
                </div>
              );
            })}
          </div>

          {/* ---- buyer + payment ---- */}
          {cart.length > 0 && (
            <>
              <div className="section-title" style={{ margin: '14px 0 8px' }}>{t('sell_buyer_optional')}</div>
              <div className="form-row-2">
                <div className="form-group">
                  <div className="form-label">{t('sell_name')}</div>
                  <input className="form-input" style={{ padding: '0 14px' }} value={buyerName}
                         onChange={(e) => setBuyerName(e.target.value)} placeholder={t('sell_name_ph')} />
                </div>
                <div className="form-group">
                  <div className="form-label">{t('sell_phone')}</div>
                  <input className="form-input" style={{ padding: '0 14px' }} value={buyerPhone}
                         onChange={(e) => setBuyerPhone(e.target.value)} placeholder={t('sell_phone_ph')} />
                </div>
              </div>
              <div className="form-group">
                <div className="form-label">{t('sell_payment')}</div>
                <div className="pay-toggle">
                  {PAYMENTS.map((p) => (
                    <button key={p.id}
                      className={`pay-opt ${paymentMode === p.id ? 'active' : ''}`}
                      onClick={() => setPaymentMode(p.id)}>{t(p.tkey)}</button>
                  ))}
                </div>
              </div>
              <div className="form-group">
                <div className="form-label">{t('sell_note')}</div>
                <input className="form-input" style={{ padding: '0 14px' }} value={note}
                       onChange={(e) => setNote(e.target.value)} placeholder={t('sell_note_ph')} />
              </div>
            </>
          )}
        </div>
      </div>

      {/* ---- sticky summary + confirm ---- */}
      {cart.length > 0 && (
        <div className="sell-summary">
          <div className="sell-summary-figures">
            <div>
              <div className="sell-sum-label">{t('sell_total')}</div>
              <div className="sell-sum-total">{inr(total)}</div>
            </div>
            <div className="sell-sum-profit" title={t('sell_profit_tip')}>
              <div className="sell-sum-label">{t('sell_profit_internal')}</div>
              <div className={profit < 0 ? 'sell-sum-loss' : 'sell-sum-gain'}>{inr(profit)}</div>
            </div>
          </div>
          <button className="btn-confirm" onClick={complete} disabled={!canSell}>
            {busy ? t('saving') : t('sell_complete')}
          </button>
        </div>
      )}
    </>
  );
}
