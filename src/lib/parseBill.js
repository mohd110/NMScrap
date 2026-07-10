// ------------------------------------------------------------------
//  Bill parsing (OCR) — MOCK implementation.
//
//  parseBill(file) simulates reading a printed or handwritten bill and
//  returns structured line items + the raw text. The editable review
//  modal then lets the user correct anything before it hits inventory.
//
//  TO GO LIVE with real OCR: replace the body of parseBill() with a call
//  to a Supabase Edge Function that forwards the image to a vision model
//  (e.g. Claude) and returns the same { rawText, items } shape. The rest
//  of the app does not change.
// ------------------------------------------------------------------

const SAMPLE_BILLS = [
  {
    rawText: `NM SCRAP - PURCHASE BILL
CAST IRON       2100 kg @ 18.00
STAINLESS STEEL  340 kg @ 85.00
COPPER WIRE MIX   45 kg @ 620.00
--------------------------------
SUBTOTAL             ...`,
    items: [
      { name: 'Cast Iron', unit: 'kg', quantity: 2100, unit_price: 18 },
      { name: 'Stainless Steel', unit: 'kg', quantity: 340, unit_price: 85 },
      { name: 'Copper Wire Mix', unit: 'kg', quantity: 45, unit_price: 620 },
    ],
  },
  {
    rawText: `HANDWRITTEN NOTE
Aluminum sheets - 120 units @ 42
Brass fittings   - 80 kg @ 410
Iron scrap grade A - 1.5 MT @ 32000`,
    items: [
      { name: 'Aluminum Sheets', unit: 'units', quantity: 120, unit_price: 42 },
      { name: 'Brass Fittings', unit: 'kg', quantity: 80, unit_price: 410 },
      { name: 'Iron Scrap Grade A', unit: 'MT', quantity: 1.5, unit_price: 32000 },
    ],
  },
  {
    rawText: `SCRAP RECEIPT
Lead battery plates  260 kg @ 95
PVC insulated wire   150 kg @ 55
Steel turnings       900 kg @ 21`,
    items: [
      { name: 'Lead Battery Plates', unit: 'kg', quantity: 260, unit_price: 95 },
      { name: 'PVC Insulated Wire', unit: 'kg', quantity: 150, unit_price: 55 },
      { name: 'Steel Turnings', unit: 'kg', quantity: 900, unit_price: 21 },
    ],
  },
];

// Returns a Promise<{ rawText, items }>. Simulates network / processing time.
export function parseBill(/* file */) {
  return new Promise((resolve) => {
    const sample = SAMPLE_BILLS[Math.floor(Math.random() * SAMPLE_BILLS.length)];
    setTimeout(() => {
      resolve({
        rawText: sample.rawText,
        items: sample.items.map((it) => ({ ...it })),
      });
    }, 1400);
  });
}
