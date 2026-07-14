import { useLang } from '../context/LangContext';
import { inr, qty } from '../lib/format';

const BUSINESS = 'NM Scrap Enterprises';

// Build the plain-text version of a bill for WhatsApp (no profit, buyer-facing).
function billText(bill) {
  const lines = bill.items.map(
    (it) => `${it.product_name} — ${qty(it.quantity, it.unit)} × ${inr(it.sale_price)} = ${inr(it.line_total)}`
  );
  return [
    `*${BUSINESS}*`,
    `Bill ${bill.bill_no}`,
    bill.buyer_name ? `Buyer: ${bill.buyer_name}` : null,
    '',
    ...lines,
    '',
    `TOTAL: ${inr(bill.total)}`,
    `Payment: ${(bill.payment_mode || 'cash').toUpperCase()}`,
    '',
    'Thank you for your business 🙏',
  ]
    .filter((l) => l !== null)
    .join('\n');
}

// A printable customer bill. Profit is shown on screen for the owner only
// (class "no-print") and never appears on the printed / shared copy.
export default function BillReceipt({ bill, onClose, showProfit = true }) {
  const { t } = useLang();
  const date = new Date(bill.created_at || Date.now());

  const shareWhatsApp = () => {
    const text = encodeURIComponent(billText(bill));
    const digits = (bill.buyer_phone || '').replace(/\D/g, '');
    const phone = digits.length === 10 ? `91${digits}` : digits;
    const url = phone ? `https://wa.me/${phone}?text=${text}` : `https://wa.me/?text=${text}`;
    window.open(url, '_blank');
  };

  return (
    <div className="sale-receipt-wrap">
      <div className="sale-receipt print-area">
        <div className="receipt-brand">{BUSINESS}</div>
        <div className="receipt-sub">{t('rc_cash_memo')}</div>

        <div className="receipt-meta">
          <span>{t('rep_bill_title', { no: '' })}<b>{bill.bill_no}</b></span>
          <span>{date.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
        </div>
        {(bill.buyer_name || bill.buyer_phone) && (
          <div className="receipt-meta">
            <span>{bill.buyer_name || t('rc_walk_in')}</span>
            <span>{bill.buyer_phone || ''}</span>
          </div>
        )}

        <div className="receipt-lines">
          <div className="receipt-line receipt-line-head">
            <span>{t('rc_item')}</span><span>{t('rc_qty')}</span><span>{t('rc_rate')}</span><span>{t('rc_amount')}</span>
          </div>
          {bill.items.map((it) => (
            <div key={it.id || it.product_name} className="receipt-line">
              <span>{it.product_name}</span>
              <span>{qty(it.quantity, it.unit)}</span>
              <span>{inr(it.sale_price)}</span>
              <span>{inr(it.line_total ?? Number(it.quantity) * Number(it.sale_price))}</span>
            </div>
          ))}
          <div className="receipt-line receipt-line-total">
            <span>{t('rc_total')}</span><span /><span /><span>{inr(bill.total)}</span>
          </div>
        </div>

        <div className="receipt-foot">
          <span>{t('rc_payment')}: <b>{(bill.payment_mode || 'cash').toUpperCase()}</b></span>
          <span>{t('rc_items', { n: bill.items.length })}</span>
        </div>
        <div className="receipt-thanks">{t('rc_thanks')}</div>

        {showProfit && (
          <div className="receipt-profit no-print">
            {t('rc_profit_line', { profit: inr(bill.profit) })}
          </div>
        )}
      </div>

      <div className="receipt-actions no-print">
        <button className="action-btn outlined" onClick={() => window.print()}>{t('rc_print')}</button>
        <button className="action-btn outlined" onClick={shareWhatsApp}>{t('rc_whatsapp')}</button>
        {onClose && <button className="btn-confirm receipt-done" onClick={onClose}>{t('done')}</button>}
      </div>
    </div>
  );
}
