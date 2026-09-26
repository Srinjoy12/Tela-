import React, { useState, useRef, useEffect } from 'react';
import {
  DownloadIcon as Download,
  UploadIcon as Upload,
  CheckCircledIcon as CheckCircle2,
  ExclamationTriangleIcon as AlertCircle,
  FileTextIcon as FileSpreadsheet
} from '@radix-ui/react-icons';
import { Button } from '../ui/button';
import { BWModal } from '../common/BWModal';
import {
  downloadExcelTemplate,
  downloadCsvTemplate,
  readExcelFile,
  validateImportRows,
  guessColumnMapping,
  DEFAULT_COLUMN_MAPPING,
  type ColumnMapping,
  type ParsedRowResult,
} from '../../utils/excel';
import type { Product } from '../../types';

interface ExcelUploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  shopId: string;
  onImportSuccess: (importedProducts: Product[], duplicateStrategy: 'add' | 'overwrite' | 'skip') => Promise<{ added: number; updated: number; skipped: number }>;
}

export const ExcelUploadModal: React.FC<ExcelUploadModalProps> = ({
  isOpen,
  onClose,
  shopId,
  onImportSuccess,
}) => {
  const [step, setStep] = useState<'upload' | 'mapping' | 'preview' | 'complete'>('upload');
  const [fileName, setFileName] = useState('');
  const [headers, setHeaders] = useState<string[]>([]);
  const [rawRows, setRawRows] = useState<Record<string, any>[]>([]);
  const [mapping, setMapping] = useState<ColumnMapping>(DEFAULT_COLUMN_MAPPING);
  const [validatedRows, setValidatedRows] = useState<ParsedRowResult[]>([]);
  const [duplicateStrategy, setDuplicateStrategy] = useState<'add' | 'overwrite' | 'skip'>('add');
  const [importSummary, setImportSummary] = useState<{ added: number; updated: number; skipped: number } | null>(null);
  const [processing, setProcessing] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Reset modal state whenever it is opened
  useEffect(() => {
    if (isOpen) {
      setStep('upload');
      setFileName('');
      setHeaders([]);
      setRawRows([]);
      setValidatedRows([]);
      setImportSummary(null);
      setProcessing(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  }, [isOpen]);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setFileName(file.name);
    try {
      const { headers: parsedHeaders, rawRows: rows } = await readExcelFile(file);
      if (rows.length === 0) {
        alert('The uploaded spreadsheet has no data rows. Please ensure your sheet contains products.');
        return;
      }

      setHeaders(parsedHeaders);
      setRawRows(rows);

      // Intelligent auto-mapping handles exports, templates, and 3rd party spreadsheets
      const autoMap = guessColumnMapping(parsedHeaders);
      setMapping(autoMap);
      setStep('mapping');
    } catch (err: any) {
      console.error(err);
      alert(`Failed to read spreadsheet: ${err.message || 'Please ensure it is a valid .xlsx or .csv.'}`);
    }
  };

  const handleRunValidation = () => {
    const results = validateImportRows(rawRows, mapping, shopId);
    setValidatedRows(results);
    setStep('preview');
  };

  const handleConfirmImport = async () => {
    const validProducts = validatedRows
      .filter((r) => r.isValid)
      .map((r) => r.data as Product);

    if (validProducts.length === 0) {
      alert('No valid products to import.');
      return;
    }

    setProcessing(true);
    try {
      const summary = await onImportSuccess(validProducts, duplicateStrategy);
      setImportSummary(summary);
      setStep('complete');
    } catch (err: any) {
      console.error(err);
      alert(`Error during bulk import execution: ${err.message || 'Please try again.'}`);
    } finally {
      setProcessing(false);
    }
  };

  const validCount = validatedRows.filter((r) => r.isValid).length;
  const errorCount = validatedRows.filter((r) => !r.isValid).length;

  return (
    <BWModal
      isOpen={isOpen}
      onClose={onClose}
      title="Excel / CSV Bulk Stock Upload"
      maxWidth="780px"
    >
      {/* STEP 1: UPLOAD */}
      {step === 'upload' && (
        <div className="flex flex-col gap-4">
          <div className="bw-box-subtle flex items-center justify-between" style={{ padding: '1rem' }}>
            <div>
              <div style={{ fontWeight: 700, fontSize: '0.95rem' }}>Don't have a formatted sheet?</div>
              <div className="text-muted" style={{ fontSize: '0.85rem' }}>
                Download our blank saree stock template with pre-built columns:
              </div>
            </div>
            <div className="flex gap-2">
              <Button
                htmlType="button"
                onClick={downloadExcelTemplate}
                size="small"
                type="primary"
                title="Download standard Excel .xlsx format"
                prefix={<Download width={14} height={14} />}
              >
                Template (.xlsx)
              </Button>
              <Button
                htmlType="button"
                onClick={downloadCsvTemplate}
                size="small"
                type="secondary"
                title="Download CSV format (opens in all spreadsheet software)"
                prefix={<Download width={14} height={14} />}
              >
                Template (.csv)
              </Button>
            </div>
          </div>

          <div
            className="bw-box flex flex-col items-center justify-center text-center cursor-pointer"
            style={{ borderStyle: 'dashed', borderWidth: '2px', padding: '3rem 1.5rem' }}
            onClick={() => fileInputRef.current?.click()}
          >
            <Upload width={36} height={36} style={{ marginBottom: '1rem' }} />
            <div style={{ fontWeight: 700, fontSize: '1.1rem' }}>
              Click to browse or drop your Excel / CSV sheet here
            </div>
            <div className="text-muted" style={{ fontSize: '0.85rem', marginTop: '0.25rem' }}>
              Supports .xlsx, .xls, and .csv up to 5,000+ sarees
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept=".xlsx, .xls, .csv"
              style={{ display: 'none' }}
              onChange={handleFileChange}
            />
          </div>
        </div>
      )}

      {/* STEP 2: COLUMN MAPPING */}
      {step === 'mapping' && (
        <div className="flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <div>
              <span className="bw-badge bw-badge-black">Step 2: Map Columns</span>
              <div style={{ fontWeight: 700, marginTop: '0.25rem' }}>File: {fileName} ({rawRows.length} rows detected)</div>
            </div>
            <Button
              onClick={() => setStep('upload')}
              size="small"
              type="secondary"
            >
              Choose Different File
            </Button>
          </div>

          <p style={{ fontSize: '0.85rem', color: '#555' }}>
            Verify which column from your Excel sheet corresponds to each Tela attribute:
          </p>

          {mapping.name && mapping.costPrice && mapping.sellingPrice && (
            <div className="bw-box-subtle flex items-center gap-2" style={{ padding: '0.6rem 0.8rem', backgroundColor: '#f9f9f9', borderLeft: '4px solid #000' }}>
              <CheckCircle2 width={16} height={16} />
              <span style={{ fontSize: '0.85rem', fontWeight: 600 }}>
                All required columns (Name, Cost, Selling, Qty) were automatically matched!
              </span>
            </div>
          )}

          <div className="grid grid-cols-2 gap-3 bw-box-subtle">
            <div>
              <label className="bw-label">Product Name / Design *</label>
              <select
                className="bw-select"
                value={mapping.name}
                onChange={(e) => setMapping({ ...mapping, name: e.target.value })}
              >
                {headers.map((h) => <option key={h} value={h}>{h}</option>)}
              </select>
            </div>
            <div>
              <label className="bw-label">Product Code (SKU)</label>
              <select
                className="bw-select"
                value={mapping.code}
                onChange={(e) => setMapping({ ...mapping, code: e.target.value })}
              >
                <option value="">-- None (Auto-Generate) --</option>
                {headers.map((h) => <option key={h} value={h}>{h}</option>)}
              </select>
            </div>
            <div>
              <label className="bw-label">Category / Fabric *</label>
              <select
                className="bw-select"
                value={mapping.category}
                onChange={(e) => setMapping({ ...mapping, category: e.target.value })}
              >
                {headers.map((h) => <option key={h} value={h}>{h}</option>)}
              </select>
            </div>
            <div>
              <label className="bw-label">Quantity in Stock *</label>
              <select
                className="bw-select"
                value={mapping.quantity}
                onChange={(e) => setMapping({ ...mapping, quantity: e.target.value })}
              >
                {headers.map((h) => <option key={h} value={h}>{h}</option>)}
              </select>
            </div>
            <div>
              <label className="bw-label">Cost Price (₹) *</label>
              <select
                className="bw-select"
                value={mapping.costPrice}
                onChange={(e) => setMapping({ ...mapping, costPrice: e.target.value })}
              >
                {headers.map((h) => <option key={h} value={h}>{h}</option>)}
              </select>
            </div>
            <div>
              <label className="bw-label">Selling Price (₹) *</label>
              <select
                className="bw-select"
                value={mapping.sellingPrice}
                onChange={(e) => setMapping({ ...mapping, sellingPrice: e.target.value })}
              >
                {headers.map((h) => <option key={h} value={h}>{h}</option>)}
              </select>
            </div>
            <div>
              <label className="bw-label">Low Stock Alert Level</label>
              <select
                className="bw-select"
                value={mapping.alertLevel}
                onChange={(e) => setMapping({ ...mapping, alertLevel: e.target.value })}
              >
                <option value="">-- Default (2 pieces) --</option>
                {headers.map((h) => <option key={h} value={h}>{h}</option>)}
              </select>
            </div>
            <div>
              <label className="bw-label">Supplier / Weaver Name</label>
              <select
                className="bw-select"
                value={mapping.supplier}
                onChange={(e) => setMapping({ ...mapping, supplier: e.target.value })}
              >
                <option value="">-- None --</option>
                {headers.map((h) => <option key={h} value={h}>{h}</option>)}
              </select>
            </div>
          </div>

          <div className="flex justify-between items-center" style={{ paddingTop: '0.75rem', borderTop: '1px solid #000' }}>
            <Button onClick={() => setStep('upload')} type="secondary">
              Back
            </Button>
            <Button onClick={handleRunValidation} type="primary">
              Validate Sheet Data →
            </Button>
          </div>
        </div>
      )}

      {/* STEP 3: VALIDATION PREVIEW */}
      {step === 'preview' && (
        <div className="flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <div>
              <span className="bw-badge bw-badge-black">Step 3: Validation & Duplicates</span>
              <div style={{ fontWeight: 700, marginTop: '0.25rem' }}>
                {validCount} Valid Sarees Ready | {errorCount} Invalid Rows
              </div>
            </div>
            <Button onClick={() => setStep('mapping')} size="small" type="secondary">
              Adjust Mapping
            </Button>
          </div>

          {/* Duplicate handling option */}
          <div className="bw-box-subtle">
            <label className="bw-label">If a Product Code or Name already exists in your shop:</label>
            <div className="flex gap-4" style={{ marginTop: '0.4rem' }}>
              <label className="flex items-center gap-1 cursor-pointer">
                <input
                  type="radio"
                  name="dup"
                  checked={duplicateStrategy === 'add'}
                  onChange={() => setDuplicateStrategy('add')}
                />
                <span>Add to existing quantity (+Qty)</span>
              </label>
              <label className="flex items-center gap-1 cursor-pointer">
                <input
                  type="radio"
                  name="dup"
                  checked={duplicateStrategy === 'overwrite'}
                  onChange={() => setDuplicateStrategy('overwrite')}
                />
                <span>Overwrite with new row</span>
              </label>
              <label className="flex items-center gap-1 cursor-pointer">
                <input
                  type="radio"
                  name="dup"
                  checked={duplicateStrategy === 'skip'}
                  onChange={() => setDuplicateStrategy('skip')}
                />
                <span>Skip existing items</span>
              </label>
            </div>
          </div>

          {/* Data Table Preview (First 8 rows) */}
          <div style={{ maxHeight: '250px', overflowY: 'auto', border: '1px solid #000' }}>
            <table className="bw-table">
              <thead>
                <tr>
                  <th>Status</th>
                  <th>Row #</th>
                  <th>SKU</th>
                  <th>Product Name</th>
                  <th>Qty</th>
                  <th>Cost</th>
                  <th>Selling</th>
                  <th>Issues</th>
                </tr>
              </thead>
              <tbody>
                {validatedRows.slice(0, 15).map((row) => (
                  <tr key={row.rowNumber}>
                    <td>
                      {row.isValid ? (
                        <CheckCircle2 width={16} height={16} />
                      ) : (
                        <AlertCircle width={16} height={16} style={{ color: '#000' }} />
                      )}
                    </td>
                    <td className="mono">{row.rowNumber}</td>
                    <td className="mono">{row.data.code}</td>
                    <td>{row.data.name || '<Empty Name>'}</td>
                    <td className="mono">{row.data.quantity}</td>
                    <td className="mono">₹{row.data.costPrice}</td>
                    <td className="mono">₹{row.data.sellingPrice}</td>
                    <td style={{ fontSize: '0.75rem' }}>
                      {row.errors.length > 0 && (
                        <span style={{ fontWeight: 700 }}>{row.errors.join(', ')}</span>
                      )}
                      {row.warnings.length > 0 && (
                        <span className="text-muted"> {row.warnings.join(', ')}</span>
                      )}
                      {row.errors.length === 0 && row.warnings.length === 0 && 'OK'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {validatedRows.length > 15 && (
            <div className="text-muted text-center" style={{ fontSize: '0.8rem' }}>
              Showing first 15 of {validatedRows.length} total rows.
            </div>
          )}

          <div className="flex justify-between items-center" style={{ paddingTop: '0.75rem', borderTop: '1.5px solid #000' }}>
            <Button onClick={() => setStep('mapping')} type="secondary">
              Back to Mapping
            </Button>
            <Button
              onClick={handleConfirmImport}
              disabled={processing || validCount === 0}
              type="primary"
              loading={processing}
            >
              {processing ? 'Importing...' : `Confirm Import of ${validCount} Sarees`}
            </Button>
          </div>
        </div>
      )}

      {/* STEP 4: COMPLETE */}
      {step === 'complete' && importSummary && (
        <div className="flex flex-col gap-4 text-center" style={{ padding: '1rem' }}>
          <FileSpreadsheet width={48} height={48} style={{ margin: '0 auto' }} />
          <h2>Import Successful!</h2>
          <div className="bw-box-subtle grid grid-cols-3 gap-4" style={{ padding: '1.5rem', textAlign: 'center' }}>
            <div>
              <div className="mono" style={{ fontSize: '1.75rem', fontWeight: 800 }}>{importSummary.added}</div>
              <div className="bw-label">New Products Added</div>
            </div>
            <div>
              <div className="mono" style={{ fontSize: '1.75rem', fontWeight: 800 }}>{importSummary.updated}</div>
              <div className="bw-label">Existing Updated</div>
            </div>
            <div>
              <div className="mono" style={{ fontSize: '1.75rem', fontWeight: 800 }}>{importSummary.skipped}</div>
              <div className="bw-label">Skipped</div>
            </div>
          </div>

          <Button onClick={onClose} size="large" type="primary" style={{ marginTop: '1rem' }}>
            Return to Inventory
          </Button>
        </div>
      )}
    </BWModal>
  );
};
