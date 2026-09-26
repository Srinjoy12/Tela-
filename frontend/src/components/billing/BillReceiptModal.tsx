import React from 'react';
import {
  Share2Icon as Share2,
  ReaderIcon as Printer
} from '@radix-ui/react-icons';
import { Button } from '../ui/button';
import { BWModal } from '../common/BWModal';
import type { Bill, Shop } from '../../types';

interface BillReceiptModalProps {
  isOpen: boolean;
  onClose: () => void;
  bill: Bill | null;
  shop: Shop | null;
}

export const BillReceiptModal: React.FC<BillReceiptModalProps> = ({
  isOpen,
  onClose,
  bill,
  shop,
}) => {
  if (!bill) return null;

  const handlePrint = () => {
    window.print();
  };

  const handleShareWhatsApp = () => {
    if (!bill.customerPhone) {
      alert('Please add customer phone number to share bill.');
      return;
    }

    const itemsSummary = bill.items
      .map((item, i) => `${i + 1}. ${item.productName} (${item.quantity} pc) - ₹${item.soldPrice * item.quantity}`)
      .join('%0A');

    const message = `*INVOICE: ${shop?.name || 'Tela'}*%0A` +
      `Bill No: ${bill.billNo}%0A` +
      `Date: ${new Date(bill.date).toLocaleDateString('en-IN')}%0A` +
      `Customer: ${bill.customerName || 'Valued Customer'}%0A` +
      `--------------------------------%0A` +
      `${itemsSummary}%0A` +
      `--------------------------------%0A` +
      `*Total Paid: ₹${bill.total.toLocaleString('en-IN')}* (${bill.paymentMode})%0A%0A` +
      `Thank you for shopping with us!`;

    const cleanPhone = bill.customerPhone.replace(/[^0-9]/g, '');
    const fullPhone = cleanPhone.length === 10 ? `91${cleanPhone}` : cleanPhone;
    window.open(`https://wa.me/${fullPhone}?text=${message}`, '_blank');
  };

  return (
    <BWModal isOpen={isOpen} onClose={onClose} title="Customer Bill / Receipt" maxWidth="520px">
      <div className="flex flex-col gap-4">
        {/* Printable Receipt Paper Container */}
        <div
          id="printable-receipt"
          style={{
            border: '2px dashed #000',
            padding: '1.5rem',
            background: '#FFF',
            fontFamily: 'monospace',
          }}
        >
          {/* Shop Header */}
          <div className="text-center" style={{ borderBottom: '1px solid #000', paddingBottom: '0.75rem', marginBottom: '0.75rem' }}>
            <h2 style={{ fontSize: '1.4rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              {shop?.name || 'Retail Invoice'}
            </h2>
            {shop?.address && <div style={{ fontSize: '0.8rem' }}>{shop.address}</div>}
            {shop?.phone && <div style={{ fontSize: '0.8rem' }}>Phone: {shop.phone}</div>}
          </div>

          {/* Metadata */}
          <div className="flex justify-between" style={{ fontSize: '0.8rem', marginBottom: '0.75rem' }}>
            <div>
              <div><strong>Bill No:</strong> {bill.billNo}</div>
              <div><strong>Date:</strong> {new Date(bill.date).toLocaleDateString('en-IN')}</div>
            </div>
            <div className="text-right">
              <div><strong>Customer:</strong> {bill.customerName || 'Walk-in'}</div>
              <div><strong>Phone:</strong> {bill.customerPhone || 'N/A'}</div>
            </div>
          </div>

          {/* Line items table */}
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem', marginBottom: '1rem' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid #000', borderTop: '1px solid #000' }}>
                <th style={{ textAlign: 'left', padding: '4px 0' }}>Item</th>
                <th style={{ textAlign: 'center', padding: '4px 0' }}>Qty</th>
                <th style={{ textAlign: 'right', padding: '4px 0' }}>Rate</th>
                <th style={{ textAlign: 'right', padding: '4px 0' }}>Amount</th>
              </tr>
            </thead>
            <tbody>
              {bill.items.map((item) => (
                <tr key={item.id} style={{ borderBottom: '1px dotted #ccc' }}>
                  <td style={{ padding: '6px 0' }}>
                    <div>{item.productName}</div>
                    <div style={{ fontSize: '0.7rem', color: '#666' }}>SKU: {item.productCode}</div>
                  </td>
                  <td style={{ textAlign: 'center', padding: '6px 0' }}>{item.quantity}</td>
                  <td style={{ textAlign: 'right', padding: '6px 0' }}>₹{item.soldPrice}</td>
                  <td style={{ textAlign: 'right', padding: '6px 0' }}>₹{item.soldPrice * item.quantity}</td>
                </tr>
              ))}
            </tbody>
          </table>

          {/* Totals */}
          <div style={{ borderTop: '1px solid #000', paddingTop: '0.5rem', fontSize: '0.85rem' }}>
            <div className="flex justify-between">
              <span>Subtotal:</span>
              <span>₹{bill.subtotal.toLocaleString('en-IN')}</span>
            </div>
            {bill.discount > 0 && (
              <div className="flex justify-between">
                <span>Special Discount:</span>
                <span>-₹{bill.discount.toLocaleString('en-IN')}</span>
              </div>
            )}
            <div className="flex justify-between" style={{ borderTop: '1px solid #000', marginTop: '0.4rem', paddingTop: '0.4rem', fontSize: '1.1rem', fontWeight: 800 }}>
              <span>Total Amount:</span>
              <span>₹{bill.total.toLocaleString('en-IN')}</span>
            </div>
            <div className="flex justify-between" style={{ fontSize: '0.8rem', marginTop: '0.2rem' }}>
              <span>Payment Mode:</span>
              <span><strong>{bill.paymentMode}</strong></span>
            </div>
          </div>

          <div className="text-center" style={{ marginTop: '1.25rem', paddingTop: '0.75rem', borderTop: '1px dashed #000', fontSize: '0.75rem' }}>
            Thank you for visiting {shop?.name}! Returns accepted within 7 days with original tag.
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex justify-between items-center" style={{ marginTop: '0.5rem' }}>
          <Button onClick={handlePrint} type="secondary" prefix={<Printer width={16} height={16} />}>
            Print Receipt
          </Button>
          <Button onClick={handleShareWhatsApp} type="primary" prefix={<Share2 width={16} height={16} />}>
            Share on WhatsApp
          </Button>
        </div>
      </div>
    </BWModal>
  );
};
