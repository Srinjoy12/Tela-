import React, { useState, useEffect, useRef } from 'react';
import { Download, Upload, AlertCircle, CheckCircle, Activity } from 'lucide-react';
import { api } from '../../../../api/client/client';
import { readExcelFile, downloadHistoricalTemplate } from '../../utils/excel';
import { Button } from '../ui/button';
import { BWStatCard } from '../common/BWStatCard';
import { formatINR } from '../../utils/i18n';

interface HistoricalStats {
  totalInvested: number;
  totalSales: number;
  totalProfit: number;
  totalPieces: number;
}

export function HistoricalView({ shopId }: { shopId: string }) {
  const [stats, setStats] = useState<HistoricalStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const loadStats = async () => {
    try {
      setLoading(true);
      const data = await api.historical.getStats(shopId);
      setStats(data);
    } catch (err: any) {
      setError(err.message || 'Failed to load historical stats');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (shopId) {
      loadStats();
    }
  }, [shopId]);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setUploading(true);
      setError('');
      setSuccess('');
      
      const { rawRows } = await readExcelFile(file);
      
      if (rawRows.length === 0) {
        throw new Error('No data found in the Excel file.');
      }

      // Simple heuristic mapping
      const mappedRows = rawRows.map((row, i) => {
        // Try to find keys that look like cost, sell, qty
        const keys = Object.keys(row);
        let qty = 1;
        let costPrice = 0;
        let soldPrice = 0;
        let name = `Legacy Item ${i + 1}`;

        for (const k of keys) {
          const lk = k.toLowerCase();
          const val = row[k];
          if (typeof val === 'number') {
            if (lk.includes('qty') || lk.includes('quantity') || lk.includes('piece')) qty = val;
            else if (lk.includes('cost') || lk.includes('purchase')) costPrice = val;
            else if (lk.includes('sell') || lk.includes('sold') || lk.includes('price')) soldPrice = val;
          } else if (typeof val === 'string') {
            const num = Number(val.replace(/[^0-9.-]+/g,""));
            if (!isNaN(num)) {
               if (lk.includes('qty') || lk.includes('quantity') || lk.includes('piece')) qty = num;
               else if (lk.includes('cost') || lk.includes('purchase')) costPrice = num;
               else if (lk.includes('sell') || lk.includes('sold') || lk.includes('price')) soldPrice = num;
            }
            if (lk.includes('name') || lk.includes('item') || lk.includes('product')) name = val;
          }
        }
        
        return { name, quantity: qty, costPrice, soldPrice };
      });

      const res = await api.historical.upload(shopId, mappedRows);
      setSuccess(`Successfully imported ${res.recordsProcessed} historical records.`);
      await loadStats();
    } catch (err: any) {
      setError(err.message || 'Error processing Excel file');
    } finally {
      setUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="flex items-center gap-2">
          <Activity className="h-5 w-5 animate-spin" />
          <span>Loading historical data...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1>Historical Performance</h1>
          <p className="text-sm text-gray-600 mt-1">
            Legacy business metrics from before app usage. These metrics do not affect current stock.
          </p>
        </div>
        
        <div className="flex flex-wrap items-center gap-2">
          <Button 
            onClick={downloadHistoricalTemplate}
            type="secondary"
            prefix={<Download width={15} height={15} />}
          >
            Download Template
          </Button>

          <input
            type="file"
            accept=".xlsx, .xls, .csv"
            className="hidden"
            ref={fileInputRef}
            onChange={handleFileUpload}
          />
          <Button 
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
            type="primary"
            prefix={<Upload width={15} height={15} />}
          >
            {uploading ? 'Processing...' : 'Upload Past Data'}
          </Button>
        </div>
      </div>

      {error && (
        <div className="bw-alert">
          <AlertCircle className="h-5 w-5 text-red-600 shrink-0" />
          <p className="text-sm">{error}</p>
        </div>
      )}

      {success && (
        <div className="bg-green-50 border-2 border-black p-4 flex items-start gap-3">
          <CheckCircle className="h-5 w-5 text-green-600 shrink-0" />
          <p className="text-sm font-medium">{success}</p>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <BWStatCard
          label="TOTAL INVESTED"
          value={formatINR(stats?.totalInvested || 0)}
        />
        <BWStatCard
          label="TOTAL SOLD"
          value={formatINR(stats?.totalSales || 0)}
        />
        <BWStatCard
          label="PROFIT GAIN"
          value={formatINR(stats?.totalProfit || 0)}
          badgeType="black"
        />
        <BWStatCard
          label="PIECES SOLD"
          value={(stats?.totalPieces || 0).toLocaleString()}
        />
      </div>
      
      <div className="bw-box p-6 bg-gray-50">
        <h3 className="font-bold text-lg mb-2">How to Upload Historical Data</h3>
        <ul className="list-disc pl-5 space-y-2 text-sm">
          <li>Create an Excel file with your past data (e.g., from the last 3-4 years).</li>
          <li>Ensure it has columns containing words like <strong>Name</strong>, <strong>Qty/Quantity</strong>, <strong>Cost/Purchase</strong>, and <strong>Sell/Sold Price</strong>.</li>
          <li>Click the "Upload Past Excel Data" button and select your file.</li>
          <li>The app will automatically calculate your past invested amount, total sales, and profit gain, adding them to this dashboard.</li>
          <li><strong>Note:</strong> Uploaded items here are explicitly kept out of your current stock and regular daily dashboards.</li>
        </ul>
      </div>
    </div>
  );
}
