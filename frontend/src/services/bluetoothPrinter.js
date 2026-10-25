/**
 * Web Bluetooth ESC/POS thermal printer service.
 * Connects directly to Seznik 632-L58P (and similar BLE thermal printers)
 * via Bluetooth — bypasses the system print dialog for single-tap printing.
 *
 * 58mm paper = 32 chars/line at standard font (Font A, 12×24).
 */

// Common BLE service/characteristic UUIDs used by Chinese thermal printers
const PRINTER_PROFILES = [
    // Profile 1: Most common (Seznik, Goojprt, PeriPage, etc.)
    { service: '0000ff00-0000-1000-8000-00805f9b34fb', writeChar: '0000ff02-0000-1000-8000-00805f9b34fb' },
    // Profile 2: Alternative write characteristic
    { service: '0000ff00-0000-1000-8000-00805f9b34fb', writeChar: '0000ff01-0000-1000-8000-00805f9b34fb' },
    // Profile 3: Microchip/ISSC (some Seznik models)
    { service: '49535343-fe7d-4ae5-8fa9-9fafd205e455', writeChar: '49535343-8841-43f4-a8d4-ecbe34729bb3' },
    // Profile 4: Nordic UART
    { service: '6e400001-b5a3-f393-e0a9-e50e24dcca9e', writeChar: '6e400002-b5a3-f393-e0a9-e50e24dcca9e' },
    // Profile 5: Another common variant
    { service: '000018f0-0000-1000-8000-00805f9b34fb', writeChar: '00002af1-0000-1000-8000-00805f9b34fb' },
];

// ESC/POS command constants
const ESC = 0x1B;
const GS = 0x1D;
const LF = 0x0A;

const CMD = {
    INIT: [ESC, 0x40],                         // ESC @ — Initialize printer
    CENTER: [ESC, 0x61, 0x01],                  // ESC a 1 — Center align
    LEFT: [ESC, 0x61, 0x00],                    // ESC a 0 — Left align
    RIGHT: [ESC, 0x61, 0x02],                   // ESC a 2 — Right align
    BOLD_ON: [ESC, 0x45, 0x01],                 // ESC E 1 — Bold on
    BOLD_OFF: [ESC, 0x45, 0x00],                // ESC E 0 — Bold off
    DOUBLE_SIZE: [GS, 0x21, 0x11],              // GS ! 0x11 — Double width+height
    DOUBLE_HEIGHT: [GS, 0x21, 0x01],            // GS ! 0x01 — Double height only
    NORMAL_SIZE: [GS, 0x21, 0x00],              // GS ! 0x00 — Normal size
    FEED_3: [ESC, 0x64, 0x03],                  // ESC d 3 — Feed 3 lines
    FEED_5: [ESC, 0x64, 0x05],                  // ESC d 5 — Feed 5 lines
    CUT: [GS, 0x56, 0x42, 0x00],               // GS V B 0 — Partial cut (if supported)
};

// Singleton state
let _device = null;
let _characteristic = null;
let _connected = false;

/**
 * Check if Web Bluetooth is available
 */
export function isBluetoothAvailable() {
    return !!(navigator.bluetooth);
}

/**
 * Check if we have a printer connected
 */
export function isPrinterConnected() {
    return _connected && _device?.gatt?.connected;
}

/**
 * Get the connected printer name
 */
export function getPrinterName() {
    return _device?.name || null;
}

/**
 * Request and connect to a Bluetooth thermal printer.
 * Must be called from a user gesture (click/tap).
 */
export async function connectPrinter() {
    if (!navigator.bluetooth) {
        throw new Error('Web Bluetooth is not supported on this browser');
    }

    // If already connected, return
    if (isPrinterConnected() && _characteristic) {
        return { name: _device.name, reconnected: true };
    }

    // Request device — accept any device offering our known services
    const serviceUUIDs = [...new Set(PRINTER_PROFILES.map(p => p.service))];

    _device = await navigator.bluetooth.requestDevice({
        // Accept devices with known thermal printer services
        optionalServices: serviceUUIDs,
        // Use acceptAllDevices since printer name patterns vary
        acceptAllDevices: true,
    });

    // Listen for disconnection
    _device.addEventListener('gattserverdisconnected', () => {
        _connected = false;
        _characteristic = null;
        console.log('Printer disconnected');
    });

    // Connect to GATT server
    const server = await _device.gatt.connect();

    // Try each profile until we find a working service+characteristic
    for (const profile of PRINTER_PROFILES) {
        try {
            const service = await server.getPrimaryService(profile.service);
            _characteristic = await service.getCharacteristic(profile.writeChar);
            _connected = true;
            console.log(`Connected to ${_device.name} using service ${profile.service}`);
            return { name: _device.name, reconnected: false };
        } catch (e) {
            // This profile doesn't match, try next
            continue;
        }
    }

    // If no profile worked, try discovering all services
    try {
        const services = await server.getPrimaryServices();
        for (const service of services) {
            try {
                const chars = await service.getCharacteristics();
                for (const char of chars) {
                    if (char.properties.write || char.properties.writeWithoutResponse) {
                        _characteristic = char;
                        _connected = true;
                        console.log(`Connected via discovered service ${service.uuid}, char ${char.uuid}`);
                        return { name: _device.name, reconnected: false };
                    }
                }
            } catch (e) {
                continue;
            }
        }
    } catch (e) {
        // Discovery failed
    }

    throw new Error('Could not find a writable characteristic on the printer. Please try again.');
}

/**
 * Reconnect to a previously paired device (no user gesture needed).
 */
export async function reconnectPrinter() {
    if (!_device) return false;
    if (isPrinterConnected() && _characteristic) return true;

    try {
        const server = await _device.gatt.connect();
        for (const profile of PRINTER_PROFILES) {
            try {
                const service = await server.getPrimaryService(profile.service);
                _characteristic = await service.getCharacteristic(profile.writeChar);
                _connected = true;
                return true;
            } catch (e) {
                continue;
            }
        }
    } catch (e) {
        console.error('Reconnect failed:', e);
    }
    return false;
}

/**
 * Disconnect the printer
 */
export function disconnectPrinter() {
    if (_device?.gatt?.connected) {
        _device.gatt.disconnect();
    }
    _device = null;
    _characteristic = null;
    _connected = false;
}

/**
 * Write data to the printer in chunks (BLE has ~20 byte MTU limit).
 */
async function writeData(data) {
    if (!_characteristic) throw new Error('Printer not connected');

    const CHUNK_SIZE = 100; // Safe BLE chunk size
    const bytes = data instanceof Uint8Array ? data : new Uint8Array(data);

    for (let i = 0; i < bytes.length; i += CHUNK_SIZE) {
        const chunk = bytes.slice(i, i + CHUNK_SIZE);
        try {
            if (_characteristic.properties.writeWithoutResponse) {
                await _characteristic.writeValueWithoutResponse(chunk);
            } else {
                await _characteristic.writeValue(chunk);
            }
        } catch (e) {
            // Retry once after small delay
            await new Promise(r => setTimeout(r, 50));
            if (_characteristic.properties.writeWithoutResponse) {
                await _characteristic.writeValueWithoutResponse(chunk);
            } else {
                await _characteristic.writeValue(chunk);
            }
        }
        // Small delay between chunks for printer buffer
        await new Promise(r => setTimeout(r, 20));
    }
}

/**
 * Encode a string to bytes (handling special characters)
 */
function encode(text) {
    const encoder = new TextEncoder();
    // Replace emoji/special chars with ASCII equivalents for thermal printer
    const cleaned = text
        .replace(/🍊/g, '*')
        .replace(/[^\x00-\x7F]/g, ''); // Strip non-ASCII
    return encoder.encode(cleaned);
}

/**
 * Combine multiple byte arrays into one
 */
function concat(...arrays) {
    const flat = arrays.map(a => a instanceof Array ? new Uint8Array(a) : a);
    const totalLen = flat.reduce((sum, a) => sum + a.length, 0);
    const result = new Uint8Array(totalLen);
    let offset = 0;
    for (const arr of flat) {
        result.set(arr, offset);
        offset += arr.length;
    }
    return result;
}

/**
 * Format currency for receipt (₹ → Rs.)
 */
function formatAmount(amount) {
    return 'Rs.' + Number(amount).toFixed(2);
}

/**
 * Print a formatted receipt via ESC/POS commands.
 * Clean, professional layout — minimal bold, clear spacing.
 * @param {Object} order - The order object
 */
export async function printReceipt(order) {
    if (!isPrinterConnected()) {
        const reconnected = await reconnectPrinter();
        if (!reconnected) {
            throw new Error('Printer not connected. Tap "Connect Printer" first.');
        }
    }

    const parts = [];
    const LINE = '--------------------------------';

    // Initialize printer
    parts.push(new Uint8Array(CMD.INIT));

    // === HEADER ===
    parts.push(new Uint8Array(CMD.CENTER));
    parts.push(new Uint8Array([LF]));

    // Brand name — only thing in double size
    parts.push(new Uint8Array(CMD.BOLD_ON));
    parts.push(new Uint8Array(CMD.DOUBLE_SIZE));
    parts.push(encode('3Monks'));
    parts.push(new Uint8Array([LF]));
    parts.push(new Uint8Array(CMD.NORMAL_SIZE));
    parts.push(new Uint8Array(CMD.BOLD_OFF));

    // Tagline — normal weight, centered
    parts.push(encode('Real Fruit | No Artificial Flavor'));
    parts.push(new Uint8Array([LF]));
    parts.push(new Uint8Array([LF]));

    // Shop name — normal weight
    if (order.shopName) {
        parts.push(encode(order.shopName));
        parts.push(new Uint8Array([LF]));
    }

    parts.push(encode(LINE));
    parts.push(new Uint8Array([LF]));

    // === TOKEN NUMBER — centered, double size, bold ===
    if (order.tokenNumber) {
        parts.push(new Uint8Array(CMD.CENTER));
        parts.push(new Uint8Array(CMD.BOLD_ON));
        parts.push(new Uint8Array(CMD.DOUBLE_SIZE));
        parts.push(encode(`Token #${order.tokenNumber}`));
        parts.push(new Uint8Array([LF]));
        parts.push(new Uint8Array(CMD.NORMAL_SIZE));
        parts.push(new Uint8Array(CMD.BOLD_OFF));
        parts.push(encode(LINE));
        parts.push(new Uint8Array([LF]));
    }

    // === ORDER INFO — left aligned, normal weight ===
    parts.push(new Uint8Array(CMD.LEFT));

    parts.push(encode(`Order  : ${order.orderNumber}`));
    parts.push(new Uint8Array([LF]));

    const dateStr = new Date(order.orderDate)
        .toLocaleString('en-IN', { timeZone: 'Asia/Kolkata', day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
    parts.push(encode(`Date   : ${dateStr}`));
    parts.push(new Uint8Array([LF]));

    if (order.customerName) {
        parts.push(encode(`Customer: ${order.customerName}`));
        parts.push(new Uint8Array([LF]));
    }

    parts.push(encode(LINE));
    parts.push(new Uint8Array([LF]));

    // === ITEMS HEADER — normal weight ===
    //                   "Item              Qty      Amt"
    parts.push(encode('Item              Qty      Amt'));
    parts.push(new Uint8Array([LF]));
    parts.push(encode(LINE));
    parts.push(new Uint8Array([LF]));

    // === ITEMS — normal weight, clean columns ===
    if (order.items) {
        for (const item of order.items) {
            const label = (item.customization || item.productName || '').toString();
            const name = label.length > 18
                ? label.slice(0, 18)
                : label.padEnd(18);
            const qty = String(item.quantity).padStart(3);
            const amt = formatAmount(item.subtotal).padStart(10);
            parts.push(encode(`${name}${qty}${amt}`));
            parts.push(new Uint8Array([LF]));
        }
    }

    parts.push(encode(LINE));
    parts.push(new Uint8Array([LF]));

    // === TOTAL — bold, normal size (not double) ===
    parts.push(new Uint8Array(CMD.BOLD_ON));
    const totalLabel = 'TOTAL';
    const totalAmt = formatAmount(order.totalAmount);
    const totalPad = 32 - totalLabel.length - totalAmt.length;
    parts.push(encode(totalLabel + ' '.repeat(Math.max(1, totalPad)) + totalAmt));
    parts.push(new Uint8Array([LF]));
    parts.push(new Uint8Array(CMD.BOLD_OFF));

    // Payment — normal weight
    const payLabel = 'Paid by';
    const payVal = order.paymentMode;
    const payPad = 32 - payLabel.length - payVal.length;
    parts.push(encode(payLabel + ' '.repeat(Math.max(1, payPad)) + payVal));
    parts.push(new Uint8Array([LF]));

    parts.push(encode(LINE));
    parts.push(new Uint8Array([LF]));

    // === FOOTER — centered, normal weight ===
    parts.push(new Uint8Array(CMD.CENTER));
    parts.push(new Uint8Array([LF]));
    parts.push(encode('Thank you for visiting 3Monks!'));
    parts.push(new Uint8Array([LF]));
    parts.push(new Uint8Array([LF]));

    // Feed paper and cut
    parts.push(new Uint8Array(CMD.FEED_3));
    parts.push(new Uint8Array(CMD.CUT));

    // Combine and send
    const receipt = concat(...parts);
    await writeData(receipt);
}

/**
 * Print only the token number slip via ESC/POS.
 * @param {Object} order - The order object (needs tokenNumber, orderNumber, items, shopName)
 */
export async function printToken(order) {
    if (!isPrinterConnected()) {
        const reconnected = await reconnectPrinter();
        if (!reconnected) {
            throw new Error('Printer not connected. Tap "Connect Printer" first.');
        }
    }

    const parts = [];
    const LINE = '--------------------------------';

    parts.push(new Uint8Array(CMD.INIT));

    // Header
    parts.push(new Uint8Array(CMD.CENTER));
    parts.push(new Uint8Array([LF]));
    parts.push(new Uint8Array(CMD.BOLD_ON));
    parts.push(new Uint8Array(CMD.DOUBLE_SIZE));
    parts.push(encode('3Monks'));
    parts.push(new Uint8Array([LF]));
    parts.push(new Uint8Array(CMD.NORMAL_SIZE));
    parts.push(new Uint8Array(CMD.BOLD_OFF));

    if (order.shopName) {
        parts.push(encode(order.shopName));
        parts.push(new Uint8Array([LF]));
    }

    parts.push(encode(LINE));
    parts.push(new Uint8Array([LF]));

    // Large token number
    if (order.tokenNumber) {
        parts.push(new Uint8Array(CMD.CENTER));
        parts.push(new Uint8Array(CMD.BOLD_ON));
        parts.push(new Uint8Array(CMD.DOUBLE_SIZE));
        parts.push(encode(`Token #${order.tokenNumber}`));
        parts.push(new Uint8Array([LF]));
        parts.push(new Uint8Array(CMD.NORMAL_SIZE));
        parts.push(new Uint8Array(CMD.BOLD_OFF));
    }

    parts.push(encode(LINE));
    parts.push(new Uint8Array([LF]));

    // Items summary
    parts.push(new Uint8Array(CMD.LEFT));
    if (order.items) {
        for (const item of order.items) {
            const label = (item.customization || item.productName || '').toString();
            const name = label.length > 24 ? label.slice(0, 24) : label;
            parts.push(encode(`${item.quantity}x ${name}`));
            parts.push(new Uint8Array([LF]));
        }
    }

    parts.push(encode(LINE));
    parts.push(new Uint8Array([LF]));

    // Date/time
    parts.push(new Uint8Array(CMD.CENTER));
    const dateStr = new Date(order.orderDate)
        .toLocaleString('en-IN', { timeZone: 'Asia/Kolkata', hour: '2-digit', minute: '2-digit' });
    parts.push(encode(dateStr));
    parts.push(new Uint8Array([LF]));

    parts.push(new Uint8Array(CMD.FEED_3));
    parts.push(new Uint8Array(CMD.CUT));

    const token = concat(...parts);
    await writeData(token);
}
