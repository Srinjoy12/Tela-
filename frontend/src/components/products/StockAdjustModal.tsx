import React, { useState } from 'react';
import { BWModal } from '../common/BWModal';
import { Button } from '../ui/button';
import type { Product } from '../../types';

interface StockAdjustModalProps {
  isOpen: boolean;
  onClose: () => void;
  product: Product | null;
  onAdjust: (
    productId: string,
    quantityChange: number,
    reason: string,
    type: 'purchase' | 'adjustment' | 'return'
  ) => Promise<void>;
}

export const StockAdjustModal: React.FC<StockAdjustModalProps> = ({
  isOpen,
  onClose,
  product,
  onAdjust,
}) => {
  const [actionType, setActionType] = useState<'add' | 'remove'>('remove');
  const [quantity, setQuantity] = useState<number>(1);
  const [reasonCategory, setReasonCategory] = useState('Damaged');
  const [customReason, setCustomReason] = useState('');
  const [submitting, setSubmitting] = useState(false);

  if (!product) return null;

  const currentQty = product.quantity;
  const changeAmount = actionType === 'add' ? quantity : -quantity;
  const newQty = Math.max(0, currentQty + changeAmount);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (quantity <= 0) {
      alert('Please enter a quantity greater than 0.');
      return;
    }
    if (actionType === 'remove' && quantity > currentQty) {
      alert(`Cannot remove ${quantity} pieces. Current stock is only ${currentQty}.`);
      return;
    }

    setSubmitting(true);
    try {
      const fullReason = customReason.trim()
        ? `${reasonCategory}: ${customReason.trim()}`
        : reasonCategory;

      const movementType = actionType === 'add' ? 'purchase' : 'adjustment';
      await onAdjust(product.id, changeAmount, fullReason, movementType);
      onClose();
    } catch (err) {
      console.error(err);
      alert('Error recording stock adjustment.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <BWModal
      isOpen={isOpen}
      onClose={onClose}
      title="Quick Stock Adjustment (Audit Log)"
      maxWidth="500px"
    >
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <div className="bw-box-subtle">
          <div style={{ fontSize: '0.8rem', textTransform: 'uppercase', color: '#666' }}>Product Code: {product.code}</div>
          <div style={{ fontWeight: 700, fontSize: '1.1rem', marginTop: '0.2rem' }}>{product.name}</div>
          <div className="mono" style={{ marginTop: '0.5rem', fontSize: '0.9rem' }}>
            Current In-Stock: <strong>{currentQty} pieces</strong>
          </div>
        </div>

        {/* Direction Switch */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          <Button
            htmlType="button"
            type={actionType === 'remove' ? 'primary' : 'secondary'}
            onClick={() => {
              setActionType('remove');
              setReasonCategory('Damaged');
            }}
          >
            - Reduce Stock (Loss / Damaged)
          </Button>
          <Button
            htmlType="button"
            type={actionType === 'add' ? 'primary' : 'secondary'}
            onClick={() => {
              setActionType('add');
              setReasonCategory('New Restock / Purchase');
            }}
          >
            Add Stock (Restock / Return)
          </Button>
        </div>

        {/* Quantity */}
        <div>
          <label className="bw-label">Pieces to {actionType === 'add' ? 'Add' : 'Deduct'} *</label>
          <input
            type="number"
            min="1"
            required
            className="bw-input mono"
            value={quantity}
            onChange={(e) => setQuantity(Math.max(1, parseInt(e.target.value) || 1))}
          />
        </div>

        {/* Reason */}
        <div>
          <label className="bw-label">Audit Reason *</label>
          {actionType === 'remove' ? (
            <select
              className="bw-select"
              value={reasonCategory}
              onChange={(e) => setReasonCategory(e.target.value)}
            >
              <option value="Damaged in Shop">Damaged in Shop</option>
              <option value="Weaving Defect">Weaving Defect / Returned to Weaver</option>
              <option value="Lost / Theft">Lost or Stolen</option>
              <option value="Gift / Sample to Client">Gift / Promo Sample</option>
              <option value="Stocktake Inventory Correction">Physical Count Correction</option>
              <option value="Other">Other Reason</option>
            </select>
          ) : (
            <select
              className="bw-select"
              value={reasonCategory}
              onChange={(e) => setReasonCategory(e.target.value)}
            >
              <option value="New Restock / Purchase">New Restock / Purchase from Weaver</option>
              <option value="Customer Return / Exchange">Customer Exchange / Returned</option>
              <option value="Stocktake Inventory Correction">Physical Count Correction</option>
              <option value="Other">Other Reason</option>
            </select>
          )}
        </div>

        <div>
          <label className="bw-label">Specific Notes / Bill Reference (Optional)</label>
          <input
            type="text"
            className="bw-input"
            placeholder="e.g. Zari torn during folding, weaver batch #42"
            value={customReason}
            onChange={(e) => setCustomReason(e.target.value)}
          />
        </div>

        {/* Impact Preview */}
        <div className="bw-box flex items-center justify-between">
          <div>
            <div style={{ fontSize: '0.75rem', textTransform: 'uppercase', color: '#666' }}>New Stock Level</div>
            <div className="mono" style={{ fontSize: '1.25rem', fontWeight: 800 }}>
              {newQty} pieces
            </div>
          </div>
          <span className="bw-badge bw-badge-black mono">
            {changeAmount > 0 ? `+${changeAmount}` : changeAmount} pieces
          </span>
        </div>

        <div className="flex justify-between items-center" style={{ paddingTop: '0.5rem', borderTop: '1px solid #000' }}>
          <Button htmlType="button" onClick={onClose} type="secondary">
            Cancel
          </Button>
          <Button htmlType="submit" disabled={submitting} type="primary" loading={submitting}>
            {submitting ? 'Updating...' : 'Confirm Audit Adjustment'}
          </Button>
        </div>
      </form>
    </BWModal>
  );
};
