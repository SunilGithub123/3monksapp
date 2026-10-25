# 3Monks - Receipt & Thermal Printer Integration Guide

## Overview

The 3Monks application supports receipt printing for completed orders. The Receipt component generates a print-friendly layout compatible with standard and thermal printers.

## Receipt Content

Each receipt includes:
- **Header:** Shop name, address, phone, GST number
- **Order Info:** Order number (format: `3M-YYYYMMDD-XXXXX`), date/time
- **Items Table:** Product name, quantity, unit price, line total
- **Totals:** Subtotal, total amount
- **Payment Info:** Payment mode (CASH/UPI)
- **Footer:** Thank you message

## How to Print

### Browser-Based Printing
1. Complete an order on the New Order page
2. Click the **"Print Receipt"** button
3. A browser print dialog opens with the formatted receipt
4. Select your printer and print

### Thermal Printer Setup

#### Supported Printers
- Any ESC/POS compatible thermal printer
- Common models: Epson TM-T88, Star TSP100, Bixolon SRP-350

#### Configuration Steps

1. **Connect the printer** to the computer via USB, Serial, or Network
2. **Install printer drivers** from manufacturer's website
3. **Set as default printer** in your OS settings
4. **Paper width configuration:**
   - 80mm printers: Default receipt width works well
   - 58mm printers: Receipt auto-adjusts (narrower layout)

#### Browser Print Settings
For best results with thermal printers:
- **Margins:** None or Minimum
- **Scale:** 100%
- **Headers/Footers:** Disabled
- **Background graphics:** Disabled

### Advanced: ESC/POS Direct Printing

For direct ESC/POS printing without browser dialog, you can integrate with:

#### Option 1: QZ Tray (Recommended)
[QZ Tray](https://qz.io/) provides direct thermal printer access from the browser.

```javascript
// Example integration (not included in base app)
qz.websocket.connect().then(() => {
  const config = qz.configs.create("Epson TM-T88");
  const data = [
    '\x1B\x40',          // Initialize
    '\x1B\x61\x01',      // Center align
    '3Monks\n',
    'Fruit Shots & Blends\n',
    '\x1B\x61\x00',      // Left align
    '--------------------------------\n',
    // ... order details
  ];
  qz.print(config, data);
});
```

#### Option 2: Node.js Print Server
Run a local Node.js service that accepts print requests:
```javascript
// Local print server using escpos library
const escpos = require('escpos');
const device = new escpos.USB();
const printer = new escpos.Printer(device);

// API endpoint receives order data and prints
app.post('/print', (req, res) => {
  device.open(() => {
    printer
      .align('ct')
      .text('3Monks')
      .text('Fruit Shots & Blends')
      .drawLine()
      // ... format order items
      .cut()
      .close();
    res.json({ success: true });
  });
});
```

## Receipt CSS

The receipt uses a print-specific stylesheet that:
- Hides navigation, sidebar, and buttons
- Uses monospace font (Courier New)
- Limits width to 300px (optimal for 80mm paper)
- Uses dashed borders for visual separation
- Removes page margins for thermal printers

## Customization

To modify the receipt layout, edit:
- `frontend/src/components/Receipt.js` — Receipt structure
- `frontend/src/index.css` — Print styles (search for `.receipt` and `@media print`)

## Troubleshooting

| Issue | Solution |
|-------|---------|
| Receipt too wide | Reduce font size in Receipt component |
| Missing characters | Ensure printer supports UTF-8 or use ASCII only |
| Paper cutting issue | Check printer's auto-cut settings |
| Blank receipts | Verify printer driver installation |
| Browser dialog appears | Use QZ Tray for silent printing |
