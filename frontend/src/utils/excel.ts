import * as XLSX from 'xlsx';
import type { Product } from '../types';

export interface ColumnMapping {
  code: string;
  name: string;
  category: string;
  quantity: string;
  costPrice: string;
  sellingPrice: string;
  alertLevel: string;
  supplier: string;
  colorNotes: string;
  historicalSoldQuantity: string;
  historicalSoldPrice: string;
}

export interface ParsedRowResult {
  rowNumber: number;
  data: Partial<Product>;
  isValid: boolean;
  errors: string[];
  warnings: string[];
}

export const DEFAULT_COLUMN_MAPPING: ColumnMapping = {
  code: 'Product Code',
  name: 'Product Name',
  category: 'Category',
  quantity: 'Quantity',
  costPrice: 'Cost Price',
  sellingPrice: 'Selling Price',
  alertLevel: 'Low Stock Alert',
  supplier: 'Supplier',
  colorNotes: 'Color / Notes',
  historicalSoldQuantity: 'Already Sold Qty (Past)',
  historicalSoldPrice: 'Sold Price (Past)',
};

/**
 * Universal Number Parser for spreadsheets:
 * Safely strips currency symbols (₹, $, €, £), currency abbreviations (Rs., Rs, INR),
 * thousands commas ("1,800" -> 1800), and units ("10 pcs" -> 10).
 */
export function parseCleanNumber(val: any, fallback: number = 0): number {
  if (val === undefined || val === null || val === '') return fallback;
  if (typeof val === 'number') return isNaN(val) ? fallback : val;

  let cleaned = String(val).trim();
  // Strip currency symbols
  cleaned = cleaned.replace(/[₹$€£]/g, '');
  // Strip common prefix currencies like "Rs.", "Rs ", "INR "
  cleaned = cleaned.replace(/^(?:rs\.?|inr)\s*/i, '');
  // Strip trailing unit texts like "pcs", "pieces", "units", "mtr", "meters"
  cleaned = cleaned.replace(/\s*(?:pcs\.?|pieces?|units?|meter|meters?|m)\b/i, '');
  // Remove thousands separators
  cleaned = cleaned.replace(/,/g, '').trim();

  if (cleaned === '') return fallback;
  const parsed = Number(cleaned);
  return isNaN(parsed) ? fallback : parsed;
}

/**
 * Triggers a direct native HTTP file download via an off-screen iframe.
 * HTTP downloads with Content-Disposition: attachment trigger the OS and browser
 * download engine directly into ~/Downloads without creating or navigating to blob URLs!
 */
export function triggerHttpDownload(url: string, fallbackFilename?: string) {
  try {
    const iframe = document.createElement('iframe');
    iframe.style.position = 'fixed';
    iframe.style.top = '-9999px';
    iframe.style.left = '-9999px';
    iframe.style.width = '1px';
    iframe.style.height = '1px';
    iframe.style.opacity = '0';
    iframe.src = url;
    document.body.appendChild(iframe);
    setTimeout(() => {
      if (document.body.contains(iframe)) {
        document.body.removeChild(iframe);
      }
    }, 45000);
    return;
  } catch (err) {
    console.warn('Iframe download failed, falling back to link download:', err);
  }

  const link = document.createElement('a');
  link.href = url;
  if (fallbackFilename) {
    link.setAttribute('download', fallbackFilename);
  }
  link.style.position = 'fixed';
  link.style.top = '-9999px';
  link.style.left = '-9999px';
  document.body.appendChild(link);
  link.click();
  setTimeout(() => {
    if (document.body.contains(link)) {
      document.body.removeChild(link);
    }
  }, 5000);
}

/**
 * Saves a SheetJS workbook as an .xlsx file directly to the user's local disk.
 * Uses Base64 Data URI to prevent Chromium from opening/navigating to blob: URLs.
 */
export function saveWorkbookAsFile(workbook: XLSX.WorkBook, filename: string) {
  try {
    // Base64 Data URI (immune to blob URL navigation / premature revocation)
    const b64 = XLSX.write(workbook, { bookType: 'xlsx', type: 'base64' });
    const link = document.createElement('a');
    link.href = `data:application/octet-stream;base64,${b64}`;
    link.setAttribute('download', filename);
    link.download = filename;
    link.style.position = 'fixed';
    link.style.top = '-9999px';
    link.style.left = '-9999px';
    document.body.appendChild(link);
    link.click();
    setTimeout(() => {
      if (document.body.contains(link)) {
        document.body.removeChild(link);
      }
    }, 5000);
  } catch (err) {
    console.warn('Base64 export failed, trying XLSX.writeFile:', err);
    try {
      XLSX.writeFile(workbook, filename);
    } catch (writeErr) {
      console.error('All workbook download methods failed:', writeErr);
      alert('Unable to download Excel sheet in this browser. Please try the CSV format.');
    }
  }
}

/**
 * 1. Download Standard .xlsx Excel Template
 * Downloads natively to ~/Downloads via HTTP attachment.
 */
export function downloadExcelTemplate() {
  triggerHttpDownload('/api/downloads/template', 'Tela_Saree_Stock_Template.xlsx');
}

/**
 * 2. Download Plain CSV Template
 */
export function downloadCsvTemplate() {
  triggerHttpDownload('/api/downloads/template-csv', 'Tela_Saree_Stock_Template.csv');
}

/**
 * Guards against CSV/Excel Formula Injection (CWE-1236)
 */
export function sanitizeCellFormula(value: any): any {
  if (typeof value !== 'string') return value;
  const trimmed = value.trim();
  if (
    trimmed.startsWith('=') ||
    trimmed.startsWith('+') ||
    trimmed.startsWith('-') ||
    trimmed.startsWith('@') ||
    trimmed.startsWith('\t') ||
    trimmed.startsWith('\r')
  ) {
    return `'${value}`;
  }
  return value;
}

export function exportProductsToExcel(products: Product[], shopName: string = 'Shop', shopId?: string) {
  // If shopId is available, stream directly from the server endpoint to guarantee saving to ~/Downloads
  if (shopId) {
    const cleanName = shopName.replace(/[^a-zA-Z0-9]/g, '_');
    const dateStr = new Date().toISOString().substring(0, 10);
    triggerHttpDownload(`/api/downloads/stock-excel?shopId=${encodeURIComponent(shopId)}`, `${cleanName}_Stock_${dateStr}.xlsx`);
    return;
  }
  const exportData = products.map((p) => ({
    'Product Code': sanitizeCellFormula(p.code),
    'Product Name': sanitizeCellFormula(p.name),
    'Category': sanitizeCellFormula(p.category),
    'Quantity': p.quantity,
    'Cost Price (₹)': p.costPrice,
    'Selling Price (₹)': p.sellingPrice,
    'Expected Profit (₹)': p.sellingPrice - p.costPrice,
    'Margin %': p.sellingPrice > 0 ? Math.round(((p.sellingPrice - p.costPrice) / p.sellingPrice) * 100) : 0,
    'Total Stock Cost (₹)': p.quantity * p.costPrice,
    'Total Stock Retail (₹)': p.quantity * p.sellingPrice,
    'Low Stock Alert Level': p.alertLevel,
    'Supplier': sanitizeCellFormula(p.supplier || ''),
    'Color / Notes': sanitizeCellFormula(p.colorNotes || ''),
  }));

  const worksheet = XLSX.utils.json_to_sheet(exportData);
  worksheet['!cols'] = [
    { wch: 16 }, // Product Code
    { wch: 38 }, // Product Name
    { wch: 16 }, // Category
    { wch: 10 }, // Quantity
    { wch: 14 }, // Cost Price (₹)
    { wch: 15 }, // Selling Price (₹)
    { wch: 18 }, // Expected Profit
    { wch: 10 }, // Margin %
    { wch: 18 }, // Total Stock Cost
    { wch: 18 }, // Total Stock Retail
    { wch: 18 }, // Low Stock Alert Level
    { wch: 22 }, // Supplier
    { wch: 30 }, // Color / Notes
  ];

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Stock_Inventory');

  const cleanName = shopName.replace(/[^a-zA-Z0-9]/g, '_');
  const dateStr = new Date().toISOString().substring(0, 10);
  saveWorkbookAsFile(workbook, `${cleanName}_Stock_${dateStr}.xlsx`);
}

/**
 * 4. Export Inventory to .csv
 */
export function exportProductsToCsv(products: Product[], shopName: string = 'Shop') {
  const headers = [
    'Product Code',
    'Product Name',
    'Category',
    'Quantity',
    'Cost Price',
    'Selling Price',
    'Expected Profit',
    'Total Cost Value',
    'Total Retail Value',
    'Alert Level',
    'Supplier',
    'Notes',
  ];

  const rows = products.map((p) => [
    `"${String(sanitizeCellFormula(p.code)).replace(/"/g, '""')}"`,
    `"${String(sanitizeCellFormula(p.name)).replace(/"/g, '""')}"`,
    `"${String(sanitizeCellFormula(p.category)).replace(/"/g, '""')}"`,
    p.quantity,
    p.costPrice,
    p.sellingPrice,
    p.sellingPrice - p.costPrice,
    p.quantity * p.costPrice,
    p.quantity * p.sellingPrice,
    p.alertLevel,
    `"${String(sanitizeCellFormula(p.supplier || '')).replace(/"/g, '""')}"`,
    `"${String(sanitizeCellFormula(p.colorNotes || '')).replace(/"/g, '""')}"`,
  ]);

  const csvString = '\uFEFF' + [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
  const cleanName = shopName.replace(/[^a-zA-Z0-9]/g, '_');
  const dateStr = new Date().toISOString().substring(0, 10);
  const dataUri = 'data:text/csv;charset=utf-8,' + encodeURIComponent(csvString);
  const link = document.createElement('a');
  link.href = dataUri;
  link.setAttribute('download', `${cleanName}_Stock_${dateStr}.csv`);
  link.style.position = 'fixed';
  link.style.top = '-9999px';
  link.style.left = '-9999px';
  document.body.appendChild(link);
  link.click();
  setTimeout(() => {
    if (document.body.contains(link)) {
      document.body.removeChild(link);
    }
  }, 5000);
}

/**
 * Intelligently auto-maps spreadsheet columns to Tela attributes.
 * Distinguishes cost price from selling price and handles all database export aliases.
 */
export function guessColumnMapping(headers: string[]): ColumnMapping {
  const mapping: ColumnMapping = {
    code: '',
    name: '',
    category: '',
    quantity: '',
    costPrice: '',
    sellingPrice: '',
    alertLevel: '',
    supplier: '',
    colorNotes: '',
    historicalSoldQuantity: '',
    historicalSoldPrice: '',
  };

  const findBest = (patterns: string[], excludePatterns: string[] = []): string => {
    // 1. Exact match (case-insensitive)
    for (const p of patterns) {
      const match = headers.find((h) => h.trim().toLowerCase() === p.toLowerCase());
      if (match) return match;
    }
    // 2. Contains match with exclusions
    for (const h of headers) {
      const lower = h.trim().toLowerCase();
      const hasExclude = excludePatterns.some((ep) => lower.includes(ep.toLowerCase()));
      if (hasExclude) continue;
      if (patterns.some((p) => lower.includes(p.toLowerCase()))) {
        return h;
      }
    }
    return '';
  };

  mapping.costPrice = findBest(
    ['Cost Price (₹)', 'Cost Price', 'Purchase Price', 'Cost', 'CP', 'Buy Price', 'Purchase Rate', 'Rate (₹)', 'Rate'],
    ['selling', 'sell', 'retail', 'mrp', 'total', 'profit']
  );

  mapping.sellingPrice = findBest(
    ['Selling Price (₹)', 'Selling Price', 'Sale Price', 'Retail Price', 'MRP', 'Selling', 'SP', 'Price (₹)', 'Price'],
    ['cost', 'purchase', 'buy', 'total', 'profit']
  );

  mapping.code = findBest(
    ['Product Code', 'Item Code', 'SKU', 'Barcode', 'Item No', 'Item Number', 'Style Code', 'Design No', 'Code'],
    ['name', 'title', 'category']
  );

  mapping.name = findBest(
    ['Product Name', 'Item Name', 'Title', 'Design Name', 'Saree Name', 'Description', 'Product', 'Item', 'Name'],
    ['code', 'sku', 'number', 'no', 'barcode']
  );

  mapping.quantity = findBest(
    ['Quantity', 'Qty', 'Pieces', 'Pcs', 'Stock', 'Quantity in Stock', 'Units', 'Inventory', 'Balance'],
    ['cost', 'value', 'price', 'alert', 'level']
  );

  mapping.category = findBest(
    ['Category', 'Category / Fabric', 'Fabric', 'Type', 'Group', 'Saree Type', 'Material'],
    []
  );

  mapping.alertLevel = findBest(
    ['Low Stock Alert Level', 'Low Stock Alert', 'Alert Level', 'Min Stock', 'Minimum Stock', 'Alert', 'Reorder Level'],
    []
  );

  mapping.supplier = findBest(
    ['Supplier', 'Supplier / Weaver Name', 'Weaver', 'Vendor', 'Party', 'Manufacturer', 'Supplier Name'],
    []
  );

  mapping.colorNotes = findBest(
    ['Color / Notes', 'Color', 'Notes', 'Remarks', 'Description', 'Details', 'Colour'],
    ['name', 'product']
  );

  mapping.historicalSoldQuantity = findBest(
    ['Already Sold Qty', 'Sold Quantity', 'Past Sold Qty', 'Sold Qty', 'Sold'],
    []
  );

  mapping.historicalSoldPrice = findBest(
    ['Sold Price', 'Historical Sold Price', 'Past Sold Price', 'Already Sold Price', 'Sale Amount'],
    ['cost', 'purchase']
  );

  return mapping;
}

/**
 * 5. Read and Parse Uploaded File (.xlsx, .xls, .csv)
 * Performs intelligent sheet selection and multi-row header detection.
 */
export async function readExcelFile(
  file: File
): Promise<{ headers: string[]; rawRows: Record<string, any>[] }> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: 'array' });

        if (!workbook.SheetNames || workbook.SheetNames.length === 0) {
          throw new Error('The uploaded Excel spreadsheet contains no worksheets.');
        }

        // 1. Pick the first non-empty sheet
        let activeSheet = workbook.Sheets[workbook.SheetNames[0]];
        for (const sheetName of workbook.SheetNames) {
          const sheet = workbook.Sheets[sheetName];
          if (sheet && sheet['!ref']) {
            activeSheet = sheet;
            break;
          }
        }

        // 2. Read raw matrix of arrays
        const rawMatrix = XLSX.utils.sheet_to_json<any[]>(activeSheet, {
          header: 1,
          defval: '',
        });

        if (!rawMatrix || rawMatrix.length === 0) {
          return resolve({ headers: [], rawRows: [] });
        }

        // 3. Smart Header Row Detection
        // Scans the first 10 rows to find the row that has the highest count of recognizable inventory headers
        const headerKeywords = [
          'code',
          'sku',
          'name',
          'item',
          'product',
          'cat',
          'fabric',
          'qty',
          'quantity',
          'piece',
          'pcs',
          'cost',
          'sell',
          'price',
          'rate',
          'mrp',
          'suppl',
          'weaver',
        ];

        let bestHeaderRowIdx = 0;
        let maxMatches = -1;

        for (let r = 0; r < Math.min(rawMatrix.length, 10); r++) {
          const row = rawMatrix[r];
          if (!Array.isArray(row)) continue;
          let matches = 0;
          for (const cell of row) {
            const str = String(cell || '').trim().toLowerCase();
            if (headerKeywords.some((k) => str.includes(k))) {
              matches++;
            }
          }
          if (matches > maxMatches && matches >= 2) {
            maxMatches = matches;
            bestHeaderRowIdx = r;
          }
        }

        // 4. Extract and clean headers
        const headerRow = rawMatrix[bestHeaderRowIdx];
        const headers: string[] = [];
        const seenHeaders = new Set<string>();

        headerRow.forEach((h, colIdx) => {
          let cleanHeader = String(h || '').trim();
          if (!cleanHeader) {
            cleanHeader = `Column_${colIdx + 1}`;
          }
          // Avoid duplicate keys
          let uniqueHeader = cleanHeader;
          let counter = 2;
          while (seenHeaders.has(uniqueHeader.toLowerCase())) {
            uniqueHeader = `${cleanHeader}_${counter++}`;
          }
          seenHeaders.add(uniqueHeader.toLowerCase());
          headers.push(uniqueHeader);
        });

        // 5. Build parsed row objects
        const rawRows: Record<string, any>[] = [];
        for (let r = bestHeaderRowIdx + 1; r < rawMatrix.length; r++) {
          const row = rawMatrix[r];
          if (!Array.isArray(row)) continue;
          // Check if row is completely blank
          const hasData = row.some((c) => String(c !== undefined && c !== null ? c : '').trim() !== '');
          if (!hasData) continue;

          const rowObj: Record<string, any> = {};
          headers.forEach((hdr, colIdx) => {
            let val = row[colIdx];
            if (typeof val === 'string') {
              val = val.trim();
              // Strip formula injection single-quote escape
              if (val.startsWith("'")) {
                val = val.slice(1).trim();
              }
            }
            rowObj[hdr] = val !== undefined ? val : '';
          });
          rawRows.push(rowObj);
        }

        resolve({ headers, rawRows });
      } catch (err) {
        reject(err);
      }
    };

    reader.onerror = (error) => reject(error);
    reader.readAsArrayBuffer(file);
  });
}

/**
 * 6. Validate Mapped Rows
 */
export function validateImportRows(
  rawRows: Record<string, any>[],
  mapping: ColumnMapping,
  shopId: string
): ParsedRowResult[] {
  const timestamp = Date.now().toString().slice(-4);

  return rawRows.map((row, idx) => {
    const errors: string[] = [];
    const warnings: string[] = [];
    const rowNumber = idx + 2; // header is row 1

    const name = String(row[mapping.name] || '').trim();
    const category = String(row[mapping.category] || 'General').trim() || 'General';
    const rawCode = String(row[mapping.code] || '').trim();
    // Unique non-colliding code per row if empty
    const code = rawCode || `SKU-${timestamp}-${idx + 1}`;

    const quantity = parseCleanNumber(row[mapping.quantity], 0);
    const costPrice = parseCleanNumber(row[mapping.costPrice], 0);
    const sellingPrice = parseCleanNumber(row[mapping.sellingPrice], 0);
    const alertLevel = parseCleanNumber(row[mapping.alertLevel], 2);
    
    const historicalSoldQuantity = parseCleanNumber(row[mapping.historicalSoldQuantity], 0);
    const historicalSoldPrice = parseCleanNumber(row[mapping.historicalSoldPrice], 0);

    if (!name) {
      errors.push('Product Name is required.');
    }

    if (isNaN(quantity) || quantity < 0) {
      errors.push(`Invalid quantity: "${row[mapping.quantity]}". Must be a number >= 0.`);
    }

    if (isNaN(costPrice) || costPrice < 0) {
      errors.push(`Invalid cost price: "${row[mapping.costPrice]}". Must be a valid amount >= 0.`);
    }

    if (isNaN(sellingPrice) || sellingPrice < 0) {
      errors.push(`Invalid selling price: "${row[mapping.sellingPrice]}". Must be a valid amount >= 0.`);
    }

    if (!isNaN(sellingPrice) && !isNaN(costPrice) && costPrice > 0 && sellingPrice < costPrice) {
      warnings.push(`Selling price (₹${sellingPrice}) is below cost price (₹${costPrice}).`);
    }

    const supplier = String(row[mapping.supplier] || '').trim();
    const colorNotes = String(row[mapping.colorNotes] || '').trim();

    return {
      rowNumber,
      isValid: errors.length === 0,
      errors,
      warnings,
      data: {
        shopId,
        code,
        name,
        category: category || 'Saree',
        quantity: isNaN(quantity) ? 0 : quantity,
        costPrice: isNaN(costPrice) ? 0 : costPrice,
        sellingPrice: isNaN(sellingPrice) ? 0 : sellingPrice,
        alertLevel: isNaN(alertLevel) ? 2 : alertLevel,
        supplier,
        colorNotes,
        historicalSoldQuantity: isNaN(historicalSoldQuantity) ? 0 : historicalSoldQuantity,
        historicalSoldPrice: isNaN(historicalSoldPrice) ? 0 : historicalSoldPrice,
        archived: false,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
    };
  });
}
