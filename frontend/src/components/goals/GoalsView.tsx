import { formatINR } from '../../utils/i18n';
import React, { useState, useEffect } from 'react';
import {
  TargetIcon as Target,
  ExclamationTriangleIcon as AlertCircle,
  UpdateIcon as History,
  CalendarIcon as Calendar,
  CheckCircledIcon as CheckCircle2,
  CrossCircledIcon as XCircle
} from '@radix-ui/react-icons';
import type { Goal, Product, Bill, GoalHistoryItem } from '../../types';
import { api } from '../../../../api/client/client';
interface GoalsViewProps {
  currentGoal: Goal | null;
  products: Product[];
  bills: Bill[];
  shopId?: string;
  onUpdateGoal: (profitTarget: number, salesTarget: number, piecesTarget: number) => Promise<void>;
}

export const GoalsView: React.FC<GoalsViewProps> = ({
  currentGoal,
  products,
  bills,
  shopId,
  onUpdateGoal,
}) => {
  const [profitTarget, setProfitTarget] = useState<number>(currentGoal?.profitTarget || 50000);
  const [salesTarget, setSalesTarget] = useState<number>(currentGoal?.salesTarget || 150000);
  const [piecesTarget, setPiecesTarget] = useState<number>(currentGoal?.piecesTarget || 50);
  const [isEditing, setIsEditing] = useState(false);
  const [saving, setSaving] = useState(false);

  // Goal History state
  const [history, setHistory] = useState<GoalHistoryItem[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);

  const loadGoalHistory = React.useCallback(async () => {
    if (!shopId) return;
    setLoadingHistory(true);
    try {
      const data = await api.reports.getGoalHistory(shopId, 12);
      setHistory(data);
    } catch (err) {
      console.error('Error fetching goal history:', err);
    } finally {
      setLoadingHistory(false);
    }
  }, [shopId]);

  useEffect(() => {
    loadGoalHistory();
  }, [loadGoalHistory]);

  // Date and pace calculations (PRD Section 8)
  const now = new Date();
  const currentMonthStr = now.toISOString().substring(0, 7);
  const totalDaysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
  const dayOfMonth = now.getDate();
  const daysLeft = Math.max(1, totalDaysInMonth - dayOfMonth);

  // Month-to-date performance
  const monthBills = bills.filter((b) => b.status === 'completed' && b.date.startsWith(currentMonthStr));
  const earnedProfit = monthBills.reduce((acc, b) => acc + b.totalProfit, 0);
  const piecesSold = monthBills.reduce(
    (acc, b) => acc + b.items.reduce((sum, item) => sum + item.quantity, 0),
    0
  );

  const profitGap = Math.max(0, profitTarget - earnedProfit);
  const progressPercent = profitTarget > 0 ? Math.min(100, Math.round((earnedProfit / profitTarget) * 100)) : 0;

  // Average profit per saree sold so far (or default to avg in stock)
  const avgProfitPerPiece =
    piecesSold > 0
      ? earnedProfit / piecesSold
      : products.length > 0
      ? products.reduce((acc, p) => acc + (p.sellingPrice - p.costPrice), 0) / products.length
      : 700;

  // Sarees needed & Daily target (GL-3)
  const sareesNeeded = avgProfitPerPiece > 0 ? Math.ceil(profitGap / avgProfitPerPiece) : 0;
  const sareesPerDay = (sareesNeeded / daysLeft).toFixed(1);

  // Pace projection (GL-4)
  const dailyPaceProfit = dayOfMonth > 0 ? earnedProfit / dayOfMonth : earnedProfit;
  const projectedMonthEndProfit = Math.round(dailyPaceProfit * totalDaysInMonth);
  const isPaceBehind = projectedMonthEndProfit < profitTarget;

  // Products to push (GL-5: high margin, in stock, high profit per piece)
  const productsToPush = [...products]
    .filter((p) => p.quantity > 0 && !p.archived)
    .map((p) => ({
      ...p,
      unitProfit: p.sellingPrice - p.costPrice,
      margin: p.sellingPrice > 0 ? Math.round(((p.sellingPrice - p.costPrice) / p.sellingPrice) * 100) : 0,
    }))
    .sort((a, b) => b.unitProfit - a.unitProfit)
    .slice(0, 4);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await onUpdateGoal(Number(profitTarget), Number(salesTarget), Number(piecesTarget));
      setIsEditing(false);
      await loadGoalHistory();
    } catch (err) {
      console.error(err);
      alert('Error saving goal.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1>Monthly Goals</h1>

        </div>
        <button
          onClick={() => setIsEditing(!isEditing)}
          className="bw-btn bw-btn-outline"
        >
          <Target width={16} height={16} /> {isEditing ? 'Cancel Edit' : 'Edit Target'}
        </button>
      </div>

      {/* Goal Edit Box */}
      {isEditing && (
        <form onSubmit={handleSave} className="bw-box flex flex-col gap-3">
          <span className="bw-label">Set Your Target for {now.toLocaleString('default', { month: 'long', year: 'numeric' })}</span>
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="bw-label">Monthly Profit Target (₹) *</label>
              <input
                type="number"
                min="1000"
                required
                className="bw-input mono"
                value={profitTarget}
                onChange={(e) => setProfitTarget(parseFloat(e.target.value) || 0)}
              />
            </div>
            <div>
              <label className="bw-label">Target Gross Sales (₹)</label>
              <input
                type="number"
                min="1000"
                className="bw-input mono"
                value={salesTarget}
                onChange={(e) => setSalesTarget(parseFloat(e.target.value) || 0)}
              />
            </div>
            <div>
              <label className="bw-label">Target Pieces Sold</label>
              <input
                type="number"
                min="1"
                className="bw-input mono"
                value={piecesTarget}
                onChange={(e) => setPiecesTarget(parseInt(e.target.value) || 0)}
              />
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <button type="submit" disabled={saving} className="bw-btn">
              {saving ? 'Saving...' : 'Update Monthly Goal'}
            </button>
          </div>
        </form>
      )}

      {/* Core Progress Bar & Status (GL-2) */}
      <div className="bw-box flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <div>
            <span className="bw-label">This Month's Profit Goal ({now.toLocaleString('default', { month: 'long' })})</span>
            <div className="mono" style={{ fontSize: '2rem', fontWeight: 800 }}>
              {formatINR(earnedProfit)} <span style={{ fontSize: '1.2rem', fontWeight: 500 }}>of {formatINR(profitTarget)}</span>
            </div>
          </div>
          <div className="text-right">
            <span className="bw-badge bw-badge-black mono" style={{ fontSize: '1.1rem', padding: '0.3rem 0.6rem' }}>
              {progressPercent}% Achieved
            </span>
            <div className="text-muted" style={{ fontSize: '0.85rem', marginTop: '0.25rem' }}>
              {daysLeft} days left in month
            </div>
          </div>
        </div>

        {/* Strict Monochrome Progress Bar */}
        <div style={{ width: '100%', height: '18px', border: '2px solid #000', background: '#FFF' }}>
          <div
            style={{
              width: `${progressPercent}%`,
              height: '100%',
              background: '#000',
              transition: 'width 0.2s',
            }}
          />
        </div>

        {/* Goal Gap & Advice (GL-3) */}
        <div className="bw-box-subtle flex items-center justify-between" style={{ marginTop: '0.5rem' }}>
          <div>
            <div style={{ fontWeight: 700, fontSize: '1.05rem' }}>
              {profitGap > 0 ? (
                <>You need <span className="mono">{formatINR(profitGap)}</span> more profit this month.</>
              ) : (
                <>🎉 Congratulations! You have achieved 100% of your profit goal!</>
              )}
            </div>

          </div>
          <div className="text-right">
            <span className="bw-badge mono">{sareesPerDay} / day</span>
          </div>
        </div>

        {/* Pace Warning (GL-4) */}
        {profitGap > 0 && isPaceBehind && (
          <div
            className="flex items-center gap-2"
            style={{ border: '1.5px solid #000', padding: '0.75rem', background: '#000', color: '#FFF' }}
          >
            <AlertCircle width={18} height={18} />
            <div style={{ fontSize: '0.85rem' }}>
              <strong>Pace Warning:</strong> At your current daily pace, you are projected to reach{' '}
              <span className="mono">{formatINR(projectedMonthEndProfit)}</span> by month-end (short by{' '}
              {formatINR(profitTarget - projectedMonthEndProfit)}). Consider pushing higher-margin sarees!
            </div>
          </div>
        )}
      </div>

      {/* Recommended Products to Push */}
      <div className="flex flex-col gap-2">
        <h3>Recommended High-Margin Sarees in Stock</h3>


        <div className="grid grid-cols-4 gap-3">
          {productsToPush.map((p) => (
            <div key={p.id} className="bw-box flex flex-col justify-between" style={{ minHeight: '140px' }}>
              <div>
                <span className="bw-badge mono">{p.code}</span>
                <div style={{ fontWeight: 700, fontSize: '0.95rem', marginTop: '0.3rem' }}>{p.name}</div>
                <div className="text-muted" style={{ fontSize: '0.75rem' }}>In Stock: {p.quantity} pcs</div>
              </div>
              <div style={{ borderTop: '1px solid #000', paddingTop: '0.5rem', marginTop: '0.5rem' }}>
                <div className="flex justify-between items-center">
                  <span className="text-muted" style={{ fontSize: '0.75rem' }}>Profit per sale:</span>
                  <strong className="mono" style={{ fontSize: '1rem' }}>+{formatINR(p.unitProfit)}</strong>
                </div>
                <div className="text-right" style={{ fontSize: '0.75rem' }}>
                  ({p.margin}% margin)
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* 12-Month Performance History (Hit/Miss Log) */}
      <div className="flex flex-col gap-2" style={{ marginTop: '0.5rem' }}>
        <div className="flex items-center justify-between">
          <div>
            <h3>Goal & Profit History (Last 12 Months)</h3>

          </div>
          <button onClick={loadGoalHistory} disabled={loadingHistory} className="bw-btn bw-btn-outline bw-btn-sm">
            <History width={13} height={13} /> {loadingHistory ? 'Refreshing...' : 'Refresh History'}
          </button>
        </div>

        <div className="bw-box" style={{ padding: 0, overflowX: 'auto' }}>
          <table className="bw-table">
            <thead>
              <tr>
                <th>Month</th>
                <th className="text-right">Profit Target</th>
                <th className="text-right">Actual Profit</th>
                <th className="text-right">Gross Sales</th>
                <th className="text-right">Pieces Sold</th>
                <th className="text-right">Achieved %</th>
                <th className="text-center">Status</th>
              </tr>
            </thead>
            <tbody>
              {loadingHistory ? (
                <tr>
                  <td colSpan={7} className="text-center" style={{ padding: '2rem' }}>
                    Loading monthly history...
                  </td>
                </tr>
              ) : history.length === 0 ? (
                <tr>
                  <td colSpan={7} className="text-center" style={{ padding: '2rem' }}>
                    No goal history records available yet.
                  </td>
                </tr>
              ) : (
                history.map((row) => {
                  const isCurrent = row.month === currentMonthStr;
                  const monthDate = new Date(`${row.month}-01T00:00:00`);
                  const formattedMonth = isNaN(monthDate.getTime())
                    ? row.month
                    : monthDate.toLocaleString('default', { month: 'short', year: 'numeric' });

                  return (
                    <tr key={row.month} style={{ background: isCurrent ? '#FAFAFA' : 'transparent' }}>
                      <td>
                        <div className="flex items-center gap-2">
                          <Calendar width={14} height={14} className="text-muted" />
                          <span style={{ fontWeight: 700 }}>{formattedMonth}</span>
                          {isCurrent && (
                            <span className="bw-badge" style={{ fontSize: '0.65rem', padding: '1px 5px' }}>
                              Current
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="text-right mono">
                        {row.target !== null ? formatINR(row.target) : <span className="text-muted">Not Set</span>}
                      </td>
                      <td className="text-right mono" style={{ fontWeight: 700 }}>
                        {formatINR(row.actualProfit)}
                      </td>
                      <td className="text-right mono">
                        {formatINR(row.actualSales)}
                      </td>
                      <td className="text-right mono">
                        {row.piecesSold} pcs
                      </td>
                      <td className="text-right mono">
                        {row.achievedPercent !== null ? (
                          <span style={{ fontWeight: 700 }}>{row.achievedPercent}%</span>
                        ) : (
                          <span className="text-muted">—</span>
                        )}
                      </td>
                      <td className="text-center">
                        {row.target === null ? (
                          <span className="text-muted" style={{ fontSize: '0.75rem' }}>No Target</span>
                        ) : row.hit ? (
                          <span className="bw-badge bw-badge-black flex items-center gap-1" style={{ display: 'inline-flex', fontSize: '0.75rem' }}>
                            <CheckCircle2 width={11} height={11} /> HIT
                          </span>
                        ) : isCurrent ? (
                          <span className="bw-badge flex items-center gap-1" style={{ display: 'inline-flex', fontSize: '0.75rem' }}>
                            IN PROGRESS
                          </span>
                        ) : (
                          <span className="bw-badge bw-badge-loss flex items-center gap-1" style={{ display: 'inline-flex', fontSize: '0.75rem' }}>
                            <XCircle width={11} height={11} /> MISSED
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
