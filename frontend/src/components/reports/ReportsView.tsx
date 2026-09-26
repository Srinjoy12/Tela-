import { formatINR } from '../../utils/i18n';
import React, { useState } from 'react';
import {
  DownloadIcon as Download,
  ReaderIcon as Printer,
  ClockIcon as Clock,
  ReloadIcon as RefreshCw,
  FileTextIcon as FileText,
  CalendarIcon as Calendar,
  ArrowTopRightIcon as TrendingUp,
  ArrowDownIcon as TrendingDown,
  ExclamationTriangleIcon as AlertCircle,
  BarChartIcon as BarChart2
} from '@radix-ui/react-icons';
import type { MonthEndSummary, Bill, Product, DateRangeReport, MonthComparison } from '../../types';
import { sanitizeCellFormula, saveWorkbookAsFile } from '../../utils/excel';
import { api } from '../../../../api/client/client';
import * as XLSX from 'xlsx';
import { Button } from '../ui/button';

interface ReportsViewProps {
  summary: MonthEndSummary;
  bills: Bill[];
  products?: Product[];
  shopName: string;
  shopId?: string;
  }

type TabType = 'SUMMARY' | 'DATERANGE' | 'COMPARE' | 'RESTOCK' | 'DEADSTOCK' | 'SALES';

export const ReportsView: React.FC<ReportsViewProps> = ({
  summary,
  bills,
  shopName,
  shopId,
  }) => {
  const [activeTab, setActiveTab] = useState<TabType>('SUMMARY');

  // ─── Custom Date Range State ───────────────────────────────────────────────
  const todayStr = new Date().toISOString().substring(0, 10);
  const firstOfMonthStr = `${todayStr.substring(0, 7)}-01`;
  const [rangeFrom, setRangeFrom] = useState(firstOfMonthStr);
  const [rangeTo, setRangeTo] = useState(todayStr);
  const [rangeReport, setRangeReport] = useState<DateRangeReport | null>(null);
  const [rangeLoading, setRangeLoading] = useState(false);
  const [rangeError, setRangeError] = useState<string | null>(null);

  // ─── Month-on-Month Comparison State ───────────────────────────────────────
  const currentMonthStr = todayStr.substring(0, 7);
  const [compareMonth, setCompareMonth] = useState(currentMonthStr);
  const [comparison, setComparison] = useState<MonthComparison | null>(null);
  const [compareLoading, setCompareLoading] = useState(false);
  const [compareError, setCompareError] = useState<string | null>(null);

  // Fetch Custom Range Report
  const fetchRangeReport = async () => {
    if (!shopId) return;
    setRangeLoading(true);
    setRangeError(null);
    try {
      const res = await api.reports.getRange(shopId, rangeFrom, rangeTo);
      setRangeReport(res);
    } catch (err: any) {
      setRangeError(err.message || 'Failed to fetch date-range report');
    } finally {
      setRangeLoading(false);
    }
  };

  // Fetch MoM Comparison
  const fetchComparison = async () => {
    if (!shopId) return;
    setCompareLoading(true);
    setCompareError(null);
    try {
      const res = await api.reports.compare(shopId, compareMonth);
      setComparison(res);
    } catch (err: any) {
      setCompareError(err.message || 'Failed to fetch comparison');
    } finally {
      setCompareLoading(false);
    }
  };



  // Export Monthly Report to Excel
  const handleExportReport = () => {
    const wb = XLSX.utils.book_new();

    // Summary Sheet
    const summaryData = [
      { Metric: 'Month', Value: sanitizeCellFormula(summary.month) },
      { Metric: 'Opening Stock (Pieces)', Value: summary.openingStockPieces },
      { Metric: 'Pieces Sold', Value: summary.soldPieces },
      { Metric: 'Closing Stock (Pieces)', Value: summary.closingStockPieces },
      { Metric: 'Total Gross Sales (₹)', Value: summary.totalSales },
      { Metric: 'Cost of Goods Sold (₹)', Value: summary.cogs },
      { Metric: 'Counter Gross Margin (₹)', Value: summary.totalProfit },
      { Metric: 'Total Discount Bargained Away (₹)', Value: summary.discountGiven },
      { Metric: 'Profit Goal Target (₹)', Value: summary.goalTarget },
      { Metric: 'Goal Achieved (%)', Value: `${summary.goalAchievedPercent}%` },
    ];
    const wsSummary = XLSX.utils.json_to_sheet(summaryData);
    XLSX.utils.book_append_sheet(wb, wsSummary, 'Month_Summary');

    // Sales Sheet
    const salesData = bills.map((b) => ({
      'Bill No': sanitizeCellFormula(b.billNo),
      Date: new Date(b.date).toLocaleDateString('en-IN'),
      Customer: sanitizeCellFormula(b.customerName || 'Walk-in'),
      Phone: sanitizeCellFormula(b.customerPhone || ''),
      Items: sanitizeCellFormula(b.items.map((i) => `${i.productName} (x${i.quantity})`).join(', ')),
      'Total Amount (₹)': b.total,
      'Counter Gross Margin (₹)': b.totalProfit,
      Payment: sanitizeCellFormula(b.paymentMode),
    }));
    const wsSales = XLSX.utils.json_to_sheet(salesData);
    XLSX.utils.book_append_sheet(wb, wsSales, 'Sales_Transactions');

    // Dead Stock Sheet
    const deadStockData = summary.deadStock.map((d) => ({
      'Saree / Product': sanitizeCellFormula(d.name),
      'Stock Left (Pieces)': d.quantity,
      'Capital Locked (₹)': d.capitalLocked,
      'Aging Bucket': sanitizeCellFormula(d.agingBucket),
      'Days Since Last Sale / Added': d.daysSinceLastSale,
    }));
    const wsDead = XLSX.utils.json_to_sheet(deadStockData);
    XLSX.utils.book_append_sheet(wb, wsDead, 'Dead_Stock_Capital_Locked');

    saveWorkbookAsFile(wb, `${shopName}_Monthly_Report_${summary.month}.xlsx`);
  };

  // Export Custom Range Report to Excel
  const handleExportRangeReport = (report: DateRangeReport) => {
    const wb = XLSX.utils.book_new();
    const summaryData = [
      { Metric: 'Report Type', Value: 'Custom Date Range P&L' },
      { Metric: 'From Date', Value: report.from },
      { Metric: 'To Date', Value: report.to },
      { Metric: 'Pieces Sold', Value: report.soldPieces },
      { Metric: 'Closing Stock (Pieces)', Value: report.closingStockPieces },
      { Metric: 'Total Gross Sales (₹)', Value: report.totalSales },
      { Metric: 'Cost of Goods Sold (₹)', Value: report.cogs },
      { Metric: 'Counter Gross Margin (₹)', Value: report.totalProfit },
      { Metric: 'Total Discount Bargained Away (₹)', Value: report.discountGiven },
      { Metric: 'Average Discount (%)', Value: `${report.discountAvgPercent}%` },
      { Metric: 'Loss-Making Sales Count', Value: report.lossMakingSalesCount },
      { Metric: 'Loss-Making Amount (₹)', Value: report.lossMakingTotalAmount },
    ];
    const wsSummary = XLSX.utils.json_to_sheet(summaryData);
    XLSX.utils.book_append_sheet(wb, wsSummary, 'Range_Summary');

    saveWorkbookAsFile(wb, `${shopName}_Report_${report.from}_to_${report.to}.xlsx`);
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1>Reports & Insights</h1>

        </div>
        <div className="flex flex-wrap gap-2">
          <Button onClick={() => window.print()} type="secondary" prefix={<Printer width={16} height={16} />}>
            Print Report
          </Button>
          <Button onClick={handleExportReport} type="primary" prefix={<Download width={16} height={16} />}>
            Download Monthly Excel
          </Button>
        </div>
      </div>

      {/* MONTH SUMMARY CARD */}
      <div className="bw-box" style={{ border: '2px solid #000', background: '#000', color: '#FFF' }}>
        <div className="flex items-center gap-2" style={{ marginBottom: '0.5rem' }}>
          <FileText width={18} height={18} />
          <span style={{ fontSize: '0.85rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            Month Summary ({summary.month})
          </span>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="flex gap-2" style={{ borderBottom: '1.5px solid #000', paddingBottom: '0.5rem', flexWrap: 'wrap' }}>
        <Button
          onClick={() => setActiveTab('SUMMARY')}
          size="small"
          type={activeTab === 'SUMMARY' ? 'primary' : 'secondary'}
        >
          Overview & Financials
        </Button>
        <Button
          onClick={() => {
            setActiveTab('DATERANGE');
            if (!rangeReport && shopId) fetchRangeReport();
          }}
          size="small"
          type={activeTab === 'DATERANGE' ? 'primary' : 'secondary'}
          prefix={<Calendar width={14} height={14} />}
        >
          Custom Date Range
        </Button>
        <Button
          onClick={() => {
            setActiveTab('COMPARE');
            if (!comparison && shopId) fetchComparison();
          }}
          size="small"
          type={activeTab === 'COMPARE' ? 'primary' : 'secondary'}
          prefix={<BarChart2 width={14} height={14} />}
        >
          MoM Comparison
        </Button>
        <Button
          onClick={() => setActiveTab('RESTOCK')}
          size="small"
          type={activeTab === 'RESTOCK' ? 'primary' : 'secondary'}
        >
          Restock ({summary.restockSuggestions.length})
        </Button>
        <Button
          onClick={() => setActiveTab('DEADSTOCK')}
          size="small"
          type={activeTab === 'DEADSTOCK' ? 'primary' : 'secondary'}
        >
          Unsold Sarees ({summary.deadStock.length})
        </Button>
        <Button
          onClick={() => setActiveTab('SALES')}
          size="small"
          type={activeTab === 'SALES' ? 'primary' : 'secondary'}
        >
          Bills Issued ({bills.length})
        </Button>
      </div>

      {/* TAB 1: FINANCIAL SUMMARY */}
      {activeTab === 'SUMMARY' && (
        <div className="flex flex-col gap-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            <div className="bw-box">
              <span className="bw-label">Total Pieces Sold</span>
              <div className="mono" style={{ fontSize: '1.5rem', fontWeight: 800 }}>
                {summary.soldPieces} <span style={{ fontSize: '0.85rem' }}>pcs</span>
              </div>
              <span className="text-muted" style={{ fontSize: '0.75rem' }}>Closing: {summary.closingStockPieces} pcs</span>
            </div>
            <div className="bw-box">
              <span className="bw-label">Gross Revenue</span>
              <div className="mono" style={{ fontSize: '1.5rem', fontWeight: 800 }}>
                {formatINR(summary.totalSales)}
              </div>
              <span className="text-muted" style={{ fontSize: '0.75rem' }}>Billed amount collected</span>
            </div>
            <div className="bw-box">
              <span className="bw-label">Cost of Goods Sold (COGS)</span>
              <div className="mono" style={{ fontSize: '1.5rem', fontWeight: 800 }}>
                {formatINR(summary.cogs)}
              </div>
              <span className="text-muted" style={{ fontSize: '0.75rem' }}>Purchase cost of items sold</span>
            </div>
            <div className="bw-box">
              <span className="bw-label">Counter Gross Margin (PL-2)</span>
              <div className="mono" style={{ fontSize: '1.5rem', fontWeight: 800 }}>
                {formatINR(summary.totalProfit)}
              </div>
              <span className="text-muted" style={{ fontSize: '0.75rem' }}>
                {summary.totalSales > 0 ? Math.round((summary.totalProfit / summary.totalSales) * 100) : 0}% gross margin
              </span>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <div className="bw-box">
              <h3>Bargaining & Discounts Given (PL-4)</h3>
              <div style={{ marginTop: '0.75rem' }}>
                <div className="mono" style={{ fontSize: '1.5rem', fontWeight: 800 }}>
                  {formatINR(summary.discountGiven)}
                </div>
                <p className="text-muted" style={{ fontSize: '0.85rem', marginTop: '0.2rem' }}>
                  Total value given away during counter price negotiation. Average discount rate is{' '}
                  <strong>{summary.discountAvgPercent}%</strong> below listed counter prices.
                </p>
              </div>
            </div>

            <div className="bw-box">
              <h3>Loss-Making Sales Audit (IN-5)</h3>
              <div style={{ marginTop: '0.75rem' }}>
                <div className="mono" style={{ fontSize: '1.5rem', fontWeight: 800 }}>
                  {summary.lossMakingSalesCount} <span style={{ fontSize: '0.85rem' }}>below-cost items</span>
                </div>
                <p className="text-muted" style={{ fontSize: '0.85rem', marginTop: '0.2rem' }}>
                  {summary.lossMakingSalesCount > 0 ? (
                    <span style={{ fontWeight: 700 }}>
                      Loss incurred: {formatINR(summary.lossMakingTotalAmount)}. Verify bargaining limits with counter staff.
                    </span>
                  ) : (
                    'Excellent! Zero sales were made below cost price this month.'
                  )}
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: CUSTOM DATE RANGE REPORT */}
      {activeTab === 'DATERANGE' && (
        <div className="flex flex-col gap-4">
          <div className="bw-box-subtle flex items-center justify-between gap-4" style={{ flexWrap: 'wrap' }}>
            <div className="flex items-center gap-3" style={{ flexWrap: 'wrap' }}>
              <div className="flex items-center gap-2">
                <span className="bw-label" style={{ margin: 0 }}>From:</span>
                <input
                  type="date"
                  className="bw-input mono"
                  style={{ width: '160px', padding: '0.35rem 0.5rem' }}
                  value={rangeFrom}
                  onChange={(e) => setRangeFrom(e.target.value)}
                />
              </div>
              <div className="flex items-center gap-2">
                <span className="bw-label" style={{ margin: 0 }}>To:</span>
                <input
                  type="date"
                  className="bw-input mono"
                  style={{ width: '160px', padding: '0.35rem 0.5rem' }}
                  value={rangeTo}
                  onChange={(e) => setRangeTo(e.target.value)}
                />
              </div>
              <Button
                onClick={fetchRangeReport}
                disabled={rangeLoading || !rangeFrom || !rangeTo}
                size="small"
                type="primary"
                loading={rangeLoading}
              >
                {rangeLoading ? 'Calculating...' : 'Run Range Report'}
              </Button>
            </div>

            {rangeReport && (
              <Button
                onClick={() => handleExportRangeReport(rangeReport)}
                size="small"
                type="secondary"
                prefix={<Download width={14} height={14} />}
              >
                Download Range Excel
              </Button>
            )}
          </div>

          {rangeError && (
            <div className="bw-box flex items-center gap-2" style={{ background: '#000', color: '#FFF' }}>
              <AlertCircle width={18} height={18} />
              <span>{rangeError}</span>
            </div>
          )}

          {rangeLoading ? (
            <div className="bw-box text-center" style={{ padding: '3rem' }}>
              <div className="mono" style={{ fontWeight: 700 }}>Calculating metrics for {rangeFrom} to {rangeTo}...</div>
            </div>
          ) : rangeReport ? (
            <div className="flex flex-col gap-4">
              <div className="bw-box" style={{ border: '2px solid #000', background: '#000', color: '#FFF' }}>
                <span className="mono" style={{ fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  Period: {new Date(rangeReport.from).toLocaleDateString('en-IN')} to {new Date(rangeReport.to).toLocaleDateString('en-IN')}
                </span>
                <div style={{ fontSize: '1.1rem', marginTop: '0.25rem' }}>
                  Total Sales: <strong>{formatINR(rangeReport.totalSales)}</strong> | Net Profit: <strong>{formatINR(rangeReport.totalProfit)}</strong> | Pieces Sold: <strong>{rangeReport.soldPieces} pcs</strong>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                <div className="bw-box">
                  <span className="bw-label">Pieces Sold in Period</span>
                  <div className="mono" style={{ fontSize: '1.5rem', fontWeight: 800 }}>
                    {rangeReport.soldPieces} <span style={{ fontSize: '0.85rem' }}>pcs</span>
                  </div>
                  <span className="text-muted" style={{ fontSize: '0.75rem' }}>Current stock: {rangeReport.closingStockPieces} pcs</span>
                </div>
                <div className="bw-box">
                  <span className="bw-label">Gross Revenue</span>
                  <div className="mono" style={{ fontSize: '1.5rem', fontWeight: 800 }}>
                    {formatINR(rangeReport.totalSales)}
                  </div>
                  <span className="text-muted" style={{ fontSize: '0.75rem' }}>Billed amount</span>
                </div>
                <div className="bw-box">
                  <span className="bw-label">Cost of Goods Sold (COGS)</span>
                  <div className="mono" style={{ fontSize: '1.5rem', fontWeight: 800 }}>
                    {formatINR(rangeReport.cogs)}
                  </div>
                  <span className="text-muted" style={{ fontSize: '0.75rem' }}>Purchase cost</span>
                </div>
                <div className="bw-box">
                  <span className="bw-label">Counter Gross Margin</span>
                  <div className="mono" style={{ fontSize: '1.5rem', fontWeight: 800 }}>
                    {formatINR(rangeReport.totalProfit)}
                  </div>
                  <span className="text-muted" style={{ fontSize: '0.75rem' }}>
                    {rangeReport.totalSales > 0 ? Math.round((rangeReport.totalProfit / rangeReport.totalSales) * 100) : 0}% margin
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                <div className="bw-box">
                  <h3>Discounts Negotiated Away</h3>
                  <div style={{ marginTop: '0.75rem' }}>
                    <div className="mono" style={{ fontSize: '1.5rem', fontWeight: 800 }}>
                      {formatINR(rangeReport.discountGiven)}
                    </div>
                    <p className="text-muted" style={{ fontSize: '0.85rem', marginTop: '0.2rem' }}>
                      Average discount rate was <strong>{rangeReport.discountAvgPercent}%</strong> across this period.
                    </p>
                  </div>
                </div>
                <div className="bw-box">
                  <h3>Loss-Making Sales Audit</h3>
                  <div style={{ marginTop: '0.75rem' }}>
                    <div className="mono" style={{ fontSize: '1.5rem', fontWeight: 800 }}>
                      {rangeReport.lossMakingSalesCount} <span style={{ fontSize: '0.85rem' }}>below-cost items</span>
                    </div>
                    <p className="text-muted" style={{ fontSize: '0.85rem', marginTop: '0.2rem' }}>
                      {rangeReport.lossMakingSalesCount > 0
                        ? `Total loss incurred: ${formatINR(rangeReport.lossMakingTotalAmount)}`
                        : 'No loss-making sales were made during this period.'}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="bw-box text-center" style={{ padding: '3rem' }}>
              Select a date range above and click "Run Range Report" to analyze.
            </div>
          )}
        </div>
      )}

      {/* TAB 3: MONTH-ON-MONTH COMPARISON */}
      {activeTab === 'COMPARE' && (
        <div className="flex flex-col gap-4">
          <div className="bw-box-subtle flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <span className="bw-label" style={{ margin: 0 }}>Compare Month:</span>
              <input
                type="month"
                className="bw-input mono"
                style={{ width: '180px', padding: '0.35rem 0.5rem' }}
                value={compareMonth}
                onChange={(e) => setCompareMonth(e.target.value)}
              />
              <Button
                onClick={fetchComparison}
                disabled={compareLoading || !compareMonth}
                size="small"
                type="primary"
                loading={compareLoading}
              >
                {compareLoading ? 'Comparing...' : 'Compare Months'}
              </Button>
            </div>
            <span className="text-muted" style={{ fontSize: '0.8rem' }}>
              Compares against immediately preceding calendar month
            </span>
          </div>

          {compareError && (
            <div className="bw-box flex items-center gap-2" style={{ background: '#000', color: '#FFF' }}>
              <AlertCircle width={18} height={18} />
              <span>{compareError}</span>
            </div>
          )}

          {compareLoading ? (
            <div className="bw-box text-center" style={{ padding: '3rem' }}>
              <div className="mono" style={{ fontWeight: 700 }}>Calculating month-on-month deltas...</div>
            </div>
          ) : comparison ? (
            <div className="flex flex-col gap-4">
              {/* MoM Performance Cards */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                <div className="bw-box flex flex-col justify-between">
                  <div>
                    <span className="bw-label">Gross Revenue Change</span>
                    <div className="mono" style={{ fontSize: '1.75rem', fontWeight: 800, marginTop: '0.25rem' }}>
                      {formatINR(comparison.current.totalSales)}
                    </div>
                    <div className="text-muted" style={{ fontSize: '0.8rem', marginTop: '0.2rem' }}>
                      vs {formatINR(comparison.previous.totalSales)} (prev month)
                    </div>
                  </div>
                  <div style={{ marginTop: '0.75rem' }}>
                    <span
                      className={`bw-badge ${comparison.salesChange >= 0 ? 'bw-badge-black' : 'bw-badge-loss'}`}
                      style={{ fontSize: '0.85rem', padding: '3px 8px' }}
                    >
                      {comparison.salesChange >= 0 ? <TrendingUp width={13} height={13} style={{ display: 'inline', marginRight: '4px' }} /> : <TrendingDown width={13} height={13} style={{ display: 'inline', marginRight: '4px' }} />}
                      {comparison.salesChange >= 0 ? `+${comparison.salesChange}%` : `${comparison.salesChange}%`} Growth
                    </span>
                  </div>
                </div>

                <div className="bw-box flex flex-col justify-between">
                  <div>
                    <span className="bw-label">Counter Profit Change</span>
                    <div className="mono" style={{ fontSize: '1.75rem', fontWeight: 800, marginTop: '0.25rem' }}>
                      {formatINR(comparison.current.totalProfit)}
                    </div>
                    <div className="text-muted" style={{ fontSize: '0.8rem', marginTop: '0.2rem' }}>
                      vs {formatINR(comparison.previous.totalProfit)} (prev month)
                    </div>
                  </div>
                  <div style={{ marginTop: '0.75rem' }}>
                    <span
                      className={`bw-badge ${comparison.profitChange >= 0 ? 'bw-badge-black' : 'bw-badge-loss'}`}
                      style={{ fontSize: '0.85rem', padding: '3px 8px' }}
                    >
                      {comparison.profitChange >= 0 ? <TrendingUp width={13} height={13} style={{ display: 'inline', marginRight: '4px' }} /> : <TrendingDown width={13} height={13} style={{ display: 'inline', marginRight: '4px' }} />}
                      {comparison.profitChange >= 0 ? `+${comparison.profitChange}%` : `${comparison.profitChange}%`} Profit Delta
                    </span>
                  </div>
                </div>

                <div className="bw-box flex flex-col justify-between">
                  <div>
                    <span className="bw-label">Pieces Sold Change</span>
                    <div className="mono" style={{ fontSize: '1.75rem', fontWeight: 800, marginTop: '0.25rem' }}>
                      {comparison.current.soldPieces} <span style={{ fontSize: '0.9rem' }}>pcs</span>
                    </div>
                    <div className="text-muted" style={{ fontSize: '0.8rem', marginTop: '0.2rem' }}>
                      vs {comparison.previous.soldPieces} pcs (prev month)
                    </div>
                  </div>
                  <div style={{ marginTop: '0.75rem' }}>
                    <span
                      className={`bw-badge ${comparison.piecesSoldChange >= 0 ? 'bw-badge-black' : 'bw-badge-loss'}`}
                      style={{ fontSize: '0.85rem', padding: '3px 8px' }}
                    >
                      {comparison.piecesSoldChange >= 0 ? <TrendingUp width={13} height={13} style={{ display: 'inline', marginRight: '4px' }} /> : <TrendingDown width={13} height={13} style={{ display: 'inline', marginRight: '4px' }} />}
                      {comparison.piecesSoldChange >= 0 ? `+${comparison.piecesSoldChange}%` : `${comparison.piecesSoldChange}%`} Volume
                    </span>
                  </div>
                </div>
              </div>

              {/* Side-by-Side Detailed Breakdown Table */}
              <div style={{ border: '1.5px solid #000' }}>
                <table className="bw-table">
                  <thead>
                    <tr>
                      <th>Metric</th>
                      <th className="text-right">{comparison.current.month} (Current)</th>
                      <th className="text-right">{comparison.previous.month} (Previous)</th>
                      <th className="text-right">MoM Change</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td style={{ fontWeight: 600 }}>Total Gross Revenue</td>
                      <td className="text-right mono">{formatINR(comparison.current.totalSales)}</td>
                      <td className="text-right mono text-muted">{formatINR(comparison.previous.totalSales)}</td>
                      <td className="text-right mono">
                        <strong style={{ color: comparison.salesChange >= 0 ? '#000' : '#888' }}>
                          {comparison.salesChange >= 0 ? `+${comparison.salesChange}%` : `${comparison.salesChange}%`}
                        </strong>
                      </td>
                    </tr>
                    <tr>
                      <td style={{ fontWeight: 600 }}>Cost of Goods Sold (COGS)</td>
                      <td className="text-right mono">{formatINR(comparison.current.cogs)}</td>
                      <td className="text-right mono text-muted">{formatINR(comparison.previous.cogs)}</td>
                      <td className="text-right mono text-muted">—</td>
                    </tr>
                    <tr>
                      <td style={{ fontWeight: 600 }}>Counter Gross Profit</td>
                      <td className="text-right mono" style={{ fontWeight: 800 }}>{formatINR(comparison.current.totalProfit)}</td>
                      <td className="text-right mono text-muted">{formatINR(comparison.previous.totalProfit)}</td>
                      <td className="text-right mono">
                        <strong style={{ color: comparison.profitChange >= 0 ? '#000' : '#888' }}>
                          {comparison.profitChange >= 0 ? `+${comparison.profitChange}%` : `${comparison.profitChange}%`}
                        </strong>
                      </td>
                    </tr>
                    <tr>
                      <td style={{ fontWeight: 600 }}>Gross Margin %</td>
                      <td className="text-right mono">
                        {comparison.current.totalSales > 0 ? Math.round((comparison.current.totalProfit / comparison.current.totalSales) * 100) : 0}%
                      </td>
                      <td className="text-right mono text-muted">
                        {comparison.previous.totalSales > 0 ? Math.round((comparison.previous.totalProfit / comparison.previous.totalSales) * 100) : 0}%
                      </td>
                      <td className="text-right mono text-muted">—</td>
                    </tr>
                    <tr>
                      <td style={{ fontWeight: 600 }}>Total Sarees / Pieces Sold</td>
                      <td className="text-right mono">{comparison.current.soldPieces} pcs</td>
                      <td className="text-right mono text-muted">{comparison.previous.soldPieces} pcs</td>
                      <td className="text-right mono">
                        <strong>
                          {comparison.piecesSoldChange >= 0 ? `+${comparison.piecesSoldChange}%` : `${comparison.piecesSoldChange}%`}
                        </strong>
                      </td>
                    </tr>
                    <tr>
                      <td style={{ fontWeight: 600 }}>Discounts Bargained Away</td>
                      <td className="text-right mono">{formatINR(comparison.current.discountGiven)}</td>
                      <td className="text-right mono text-muted">{formatINR(comparison.previous.discountGiven)}</td>
                      <td className="text-right mono text-muted">—</td>
                    </tr>
                    <tr>
                      <td style={{ fontWeight: 600 }}>Loss-Making Items Sold</td>
                      <td className="text-right mono">
                        {comparison.current.lossMakingSalesCount > 0 ? (
                          <span className="bw-badge bw-badge-loss">{comparison.current.lossMakingSalesCount} items</span>
                        ) : (
                          '0 items'
                        )}
                      </td>
                      <td className="text-right mono text-muted">{comparison.previous.lossMakingSalesCount} items</td>
                      <td className="text-right mono text-muted">—</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          ) : (
            <div className="bw-box text-center" style={{ padding: '3rem' }}>
              Select a month above to generate a month-on-month comparison.
            </div>
          )}
        </div>
      )}

      {/* TAB 4: RESTOCK SUGGESTIONS */}
      {activeTab === 'RESTOCK' && (
        <div className="flex flex-col gap-3">
          <div className="bw-box-subtle flex items-center gap-2">
            <RefreshCw width={18} height={18} />
            <div>
              <strong>Restock Recommendations (IN-2):</strong> These sarees are at or below their alert threshold. Re-order from weavers to avoid stock-outs during customer visits.
            </div>
          </div>

          {summary.restockSuggestions.length === 0 ? (
            <div className="bw-box text-center" style={{ padding: '2.5rem' }}>
              All products are adequately stocked above alert thresholds.
            </div>
          ) : (
            <div style={{ border: '1.5px solid #000' }}>
              <table className="bw-table">
                <thead>
                  <tr>
                    <th>Product / Saree</th>
                    <th className="text-center">Current Stock</th>
                    <th className="text-center">Sold (30 Days)</th>
                    <th className="text-center">Velocity (Pcs/Day)</th>
                    <th className="text-center">Days of Stock Left</th>
                    <th className="text-right">Recommended Re-order</th>
                  </tr>
                </thead>
                <tbody>
                  {summary.restockSuggestions.map((item, idx) => (
                    <tr key={idx}>
                      <td style={{ fontWeight: 600 }}>{item.name}</td>
                      <td className="text-center mono">
                        <span className="bw-badge bw-badge-loss">{item.quantity} left</span>
                      </td>
                      <td className="text-center mono">{item.unitsSoldLast30Days || 0}</td>
                      <td className="text-center mono">{item.dailyVelocity ? item.dailyVelocity.toFixed(2) : '0.00'}</td>
                      <td className="text-center mono">~{item.daysLeft} days</td>
                      <td className="text-right mono">
                        <strong>Order +{Math.max(5, item.quantity * 3)} pcs</strong>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* TAB 5: DEAD STOCK & MONEY LOCKED */}
      {activeTab === 'DEADSTOCK' && (
        <div className="flex flex-col gap-3">
          <div className="bw-box-subtle flex items-center gap-2">
            <Clock width={18} height={18} />
            <div>
              <strong>Dead Stock & Capital Locked (IN-3, IN-4):</strong> Sarees with no sales in 60+ days. Money is currently stuck in these pieces.
            </div>
          </div>

          {/* Aging Buckets Breakdown */}
          {summary.deadStockAgingBuckets && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              <div className="bw-box">
                <span className="bw-label">0 – 30 Days</span>
                <div className="mono" style={{ fontSize: '1.3rem', fontWeight: 800 }}>
                  {summary.deadStockAgingBuckets['0-30'] || 0} <span style={{ fontSize: '0.8rem' }}>designs</span>
                </div>
                <span className="text-muted" style={{ fontSize: '0.75rem' }}>Fresh inventory</span>
              </div>
              <div className="bw-box">
                <span className="bw-label">31 – 60 Days</span>
                <div className="mono" style={{ fontSize: '1.3rem', fontWeight: 800 }}>
                  {summary.deadStockAgingBuckets['31-60'] || 0} <span style={{ fontSize: '0.8rem' }}>designs</span>
                </div>
                <span className="text-muted" style={{ fontSize: '0.75rem' }}>Normal cycle</span>
              </div>
              <div className="bw-box">
                <span className="bw-label">61 – 90 Days</span>
                <div className="mono" style={{ fontSize: '1.3rem', fontWeight: 800 }}>
                  {summary.deadStockAgingBuckets['61-90'] || 0} <span style={{ fontSize: '0.8rem' }}>designs</span>
                </div>
                <span className="text-muted" style={{ fontSize: '0.75rem' }}>Slow-moving stock</span>
              </div>
              <div className="bw-box" style={{ border: '2px solid #000' }}>
                <span className="bw-label">90+ Days (Dead)</span>
                <div className="mono" style={{ fontSize: '1.3rem', fontWeight: 800 }}>
                  {summary.deadStockAgingBuckets['90+'] || 0} <span style={{ fontSize: '0.8rem' }}>designs</span>
                </div>
                <span className="text-muted" style={{ fontSize: '0.75rem' }}>Immediate clearance</span>
              </div>
            </div>
          )}

          {summary.deadStock.length === 0 ? (
            <div className="bw-box text-center" style={{ padding: '2.5rem' }}>
              No dead stock detected! All sarees have recent sales.
            </div>
          ) : (
            <div style={{ border: '1.5px solid #000' }}>
              <table className="bw-table">
                <thead>
                  <tr>
                    <th>Saree Design</th>
                    <th className="text-center">Unsold Pieces</th>
                    <th className="text-right">Capital Locked</th>
                    <th className="text-center">Aging Bucket</th>
                    <th className="text-center">Days Inactive</th>
                    <th>Recommended Action</th>
                  </tr>
                </thead>
                <tbody>
                  {summary.deadStock.map((item, idx) => (
                    <tr key={idx}>
                      <td style={{ fontWeight: 600 }}>{item.name}</td>
                      <td className="text-center mono">{item.quantity}</td>
                      <td className="text-right mono" style={{ fontWeight: 700 }}>
                        {formatINR(item.capitalLocked)}
                      </td>
                      <td className="text-center">
                        <span className={`bw-badge ${item.agingBucket === '90+' ? 'bw-badge-loss' : ''}`}>
                          {item.agingBucket} days
                        </span>
                      </td>
                      <td className="text-center mono">{item.daysSinceLastSale} days</td>
                      <td style={{ fontSize: '0.8rem' }}>
                        {item.agingBucket === '90+'
                          ? 'Immediate markdown (20-30% off) or festival combo bundle to release stuck cash.'
                          : 'Feature in counter display or propose as alternative recommendation.'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* TAB 6: SALES AUDIT */}
      {activeTab === 'SALES' && (
        <div style={{ border: '1.5px solid #000', overflowX: 'auto' }}>
          <table className="bw-table">
            <thead>
              <tr>
                <th>Bill No</th>
                <th>Date</th>
                <th>Customer</th>
                <th>Items Sold</th>
                <th className="text-right">Amount (₹)</th>
                <th className="text-right">Profit (₹)</th>
                <th className="text-center">Mode</th>
              </tr>
            </thead>
            <tbody>
              {bills.length === 0 ? (
                <tr>
                  <td colSpan={7} className="text-center" style={{ padding: '2rem' }}>
                    No bills recorded yet.
                  </td>
                </tr>
              ) : (
                bills.map((bill) => (
                  <tr key={bill.id}>
                    <td className="mono" style={{ fontWeight: 700 }}>{bill.billNo}</td>
                    <td>{new Date(bill.date).toLocaleDateString('en-IN')}</td>
                    <td>{bill.customerName || 'Walk-in'} ({bill.customerPhone || 'N/A'})</td>
                    <td style={{ fontSize: '0.8rem' }}>
                      {bill.items.map((i) => `${i.productName} (${i.quantity})`).join(', ')}
                    </td>
                    <td className="text-right mono" style={{ fontWeight: 700 }}>
                      {formatINR(bill.total)}
                    </td>
                    <td className="text-right mono">
                      {bill.totalProfit >= 0 ? `+${formatINR(bill.totalProfit)}` : `-${formatINR(Math.abs(bill.totalProfit))}`}
                    </td>
                    <td className="text-center">
                      <span className="bw-badge">{bill.paymentMode}</span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};
