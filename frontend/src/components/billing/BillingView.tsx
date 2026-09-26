import { formatINR } from '../../utils/i18n';
import React, { useState } from 'react';
import {
  MagnifyingGlassIcon as Search,
  PlusIcon as Plus,
  TrashIcon as Trash2,
  ReaderIcon as Receipt,
  PersonIcon as UserCheck,
  IdCardIcon as CreditCard,
  IdCardIcon as Banknote,
  MobileIcon as Smartphone
} from '@radix-ui/react-icons';
import { Button } from '../ui/button';
import type { Product, BillItem, PaymentMode, UserRole, Bill } from '../../types';
interface BillingViewProps {
  products: Product[];
  userRole: UserRole;
  shopId: string;
  shopName: string;
  onSaveBill: (billData: Omit<Bill, 'id' | 'billNo' | 'createdAt'>) => Promise<Bill>;
}

export const BillingView: React.FC<BillingViewProps> = ({
  products,
  userRole,
  shopId,
  shopName,
  onSaveBill,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [cartItems, setCartItems] = useState<BillItem[]>([]);
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [billDiscount, setBillDiscount] = useState<number>(0);
  const [discountType, setDiscountType] = useState<'FLAT' | 'PERCENT'>('FLAT');
  const [paymentMode, setPaymentMode] = useState<PaymentMode>('Cash');
  const [amountPaidNow, setAmountPaidNow] = useState<number>(0);
  const [saving, setSaving] = useState(false);
  const [completedBill, setCompletedBill] = useState<Bill | null>(null);

  const isOwner = userRole === 'owner' || userRole === 'admin';

  // Search matching active products
  const matchingProducts = searchTerm.trim()
    ? products
        .filter((p) => !p.archived)
        .filter(
          (p) =>
            p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            p.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
            (p.colorNotes && p.colorNotes.toLowerCase().includes(searchTerm.toLowerCase()))
        )
        .slice(0, 6)
    : [];

  // Add Product to Cart (BL-1, BL-2)
  const handleAddToCart = (product: Product) => {
    const existingIndex = cartItems.findIndex((item) => item.productId === product.id);

    if (existingIndex > -1) {
      // Increment quantity
      const updated = [...cartItems];
      const item = updated[existingIndex];
      const newQty = item.quantity + 1;
      const profit = (item.soldPrice - item.costPriceAtSale) * newQty;
      updated[existingIndex] = { ...item, quantity: newQty, profit };
      setCartItems(updated);
    } else {
      // New line item
      const newItem: BillItem = {
        id: `item_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
        billId: '',
        productId: product.id,
        productCode: product.code,
        productName: product.name,
        quantity: 1,
        listedPrice: product.sellingPrice,
        soldPrice: product.sellingPrice, // default sold at listed
        costPriceAtSale: product.costPrice,
        profit: (product.sellingPrice - product.costPrice) * 1,
      };
      setCartItems([...cartItems, newItem]);
    }
    setSearchTerm('');
  };

  // Update Bargained Price for Line Item (BL-2, BL-3)
  const handleUpdateSoldPrice = (index: number, newSoldPrice: number) => {
    const updated = [...cartItems];
    const item = updated[index];
    const profit = (newSoldPrice - item.costPriceAtSale) * item.quantity;
    updated[index] = {
      ...item,
      soldPrice: Math.max(0, newSoldPrice),
      profit,
    };
    setCartItems(updated);
  };

  // Update Quantity for Line Item
  const handleUpdateQuantity = (index: number, qty: number) => {
    const validQty = Math.max(1, qty);
    const updated = [...cartItems];
    const item = updated[index];
    const profit = (item.soldPrice - item.costPriceAtSale) * validQty;
    updated[index] = {
      ...item,
      quantity: validQty,
      profit,
    };
    setCartItems(updated);
  };

  // Remove Item
  const handleRemoveItem = (index: number) => {
    setCartItems(cartItems.filter((_, i) => i !== index));
  };

  // Totals Calculations (BL-5, PL-1, PL-2)
  const subtotal = cartItems.reduce((acc, item) => acc + item.soldPrice * item.quantity, 0);
  const totalCost = cartItems.reduce((acc, item) => acc + item.costPriceAtSale * item.quantity, 0);
  const totalItemsCount = cartItems.reduce((acc, item) => acc + item.quantity, 0);

  const discountAmount =
    discountType === 'PERCENT' ? Math.round((subtotal * billDiscount) / 100) : billDiscount;

  const finalAmount = Math.max(0, subtotal - discountAmount);
  const totalProfit = subtotal - totalCost - discountAmount;
  const isOverallLoss = totalProfit < 0;

  // Save Bill
  const handleSaveBill = async () => {
    if (cartItems.length === 0) {
      alert('Cannot create an empty bill. Please add at least one saree.');
      return;
    }

    // Stock check
    for (const item of cartItems) {
      const prod = products.find((p) => p.id === item.productId);
      if (prod && prod.quantity < item.quantity) {
        const proceed = confirm(
          `Alert: "${item.productName}" has only ${prod.quantity} in stock, but bill has ${item.quantity}. Proceed anyway?`
        );
        if (!proceed) return;
      }
    }

    setSaving(true);
    try {
      const effectivePaid = paymentMode === 'Part' ? amountPaidNow : (paymentMode === 'Credit' ? 0 : finalAmount);
      const effectiveBalance = paymentMode === 'Part' ? Math.max(0, finalAmount - amountPaidNow) : (paymentMode === 'Credit' ? finalAmount : 0);

      const saved = await onSaveBill({
        shopId,
        date: new Date().toISOString(),
        customerName: customerName.trim() || undefined,
        customerPhone: customerPhone.trim() || undefined,
        items: cartItems,
        subtotal,
        discount: discountAmount,
        total: finalAmount,
        totalCost,
        totalProfit,
        paymentMode,
        amountPaid: effectivePaid,
        balanceDue: effectiveBalance,
        status: 'completed',
        createdBy: userRole,
      });

      setCompletedBill(saved);
      // Reset form
      setCartItems([]);
      setCustomerName('');
      setCustomerPhone('');
      setBillDiscount(0);
      setAmountPaidNow(0);
    } catch (err) {
      console.error(err);
      alert('Error saving bill.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <div>
          <h1>Billing & POS</h1>

        </div>
        <div className="flex items-center gap-2">
          <span className="bw-badge bw-badge-black">Counter Billing</span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* LEFT 2 COLUMNS: PRODUCT SEARCH & LINE ITEMS */}
        <div className="lg:col-span-2 flex flex-col gap-4">
          {/* Search Bar */}
          <div className="bw-box" style={{ padding: '0.75rem 1rem' }}>
            <div className="flex items-center gap-2">
              <Search width={18} height={18} />
              <input
                type="text"
                className="bw-input"
                style={{ fontSize: '1.05rem', fontWeight: 600 }}
                placeholder="Search saree by name, code (e.g. KC-001), or fabric to add..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                autoFocus
              />
            </div>

            {/* Quick Match Results Dropdown */}
            {matchingProducts.length > 0 && (
              <div
                style={{
                  border: '1.5px solid #000',
                  marginTop: '0.5rem',
                  background: '#FFF',
                }}
              >
                {matchingProducts.map((p) => (
                  <div
                    key={p.id}
                    onClick={() => handleAddToCart(p)}
                    className="flex items-center justify-between cursor-pointer"
                    style={{
                      padding: '0.6rem 0.75rem',
                      borderBottom: '1px solid #EEE',
                    }}
                  >
                    <div>
                      <span className="mono" style={{ fontWeight: 700, marginRight: '6px' }}>
                        [{p.code}]
                      </span>
                      <strong>{p.name}</strong>
                      <span className="text-muted" style={{ fontSize: '0.8rem', marginLeft: '6px' }}>
                        ({p.category})
                      </span>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="mono text-muted" style={{ fontSize: '0.85rem' }}>
                        Stock: {p.quantity} pcs
                      </span>
                      <span className="mono" style={{ fontWeight: 700 }}>
                        {formatINR(p.sellingPrice)}
                      </span>
                      <Button size="small" type="primary" prefix={<Plus width={14} height={14} />}>
                        Add
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Line Items Table */}
          <div style={{ border: '1.5px solid #000', overflowX: 'auto' }}>
            <table className="bw-table">
              <thead>
                <tr>
                  <th style={{ width: '35%' }}>Saree Item</th>
                  <th className="text-center" style={{ width: '12%' }}>Qty</th>
                  <th className="text-right" style={{ width: '15%' }}>Listed Price</th>
                  <th className="text-right" style={{ width: '18%' }}>Agreed Sold Price</th>
                  <th className="text-right" style={{ width: '15%' }}>Profit / Loss</th>
                  <th className="text-center" style={{ width: '5%' }}></th>
                </tr>
              </thead>
              <tbody>
                {cartItems.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="text-center" style={{ padding: '3rem 1rem' }}>
                      <Receipt width={36} height={36} style={{ margin: '0 auto 0.5rem' }} />
                      <div style={{ fontWeight: 700 }}>Counter Bill is Empty</div>
                      <p className="text-muted" style={{ fontSize: '0.85rem' }}>
                        Search and click a saree above or pick from quick recommendations below.
                      </p>
                    </td>
                  </tr>
                ) : (
                  cartItems.map((item, index) => {
                    const priceDiff = item.soldPrice - item.listedPrice; // Bargain difference
                    const itemProfit = item.profit;
                    const isLoss = itemProfit < 0;

                    return (
                      <tr key={item.id}>
                        <td>
                          <div style={{ fontWeight: 600 }}>{item.productName}</div>
                          <div className="mono text-muted" style={{ fontSize: '0.75rem' }}>
                            SKU: {item.productCode} {isOwner && `| Cost: ${formatINR(item.costPriceAtSale)}`}
                          </div>
                        </td>
                        <td className="text-center">
                          <input
                            type="number"
                            min="1"
                            className="bw-input mono text-center"
                            style={{ width: '60px', padding: '0.2rem' }}
                            value={item.quantity}
                            onChange={(e) => handleUpdateQuantity(index, parseInt(e.target.value) || 1)}
                          />
                        </td>
                        <td className="text-right mono text-muted">
                          {formatINR(item.listedPrice)}
                        </td>
                        <td className="text-right">
                          <input
                            type="number"
                            min="0"
                            className="bw-input mono text-right"
                            style={{ width: '100px', fontWeight: 800, padding: '0.25rem 0.5rem' }}
                            value={item.soldPrice}
                            onChange={(e) => handleUpdateSoldPrice(index, parseFloat(e.target.value) || 0)}
                          />
                          {priceDiff < 0 && (
                            <div className="text-muted" style={{ fontSize: '0.7rem' }}>
                              -{formatINR(Math.abs(priceDiff))} negotiated
                            </div>
                          )}
                        </td>
                        <td className="text-right mono">
                          {isOwner ? (
                            isLoss ? (
                              <div className="bw-badge bw-badge-loss" style={{ padding: '2px 4px' }}>
                                LOSS {formatINR(Math.abs(itemProfit))}
                              </div>
                            ) : (
                              <div>
                                <strong style={{ color: '#000' }}>
                                  +{formatINR(itemProfit)}
                                </strong>
                                {priceDiff < 0 && (
                                  <div className="text-muted" style={{ fontSize: '0.7rem' }}>
                                    (was {formatINR((item.listedPrice - item.costPriceAtSale) * item.quantity)})
                                  </div>
                                )}
                              </div>
                            )
                          ) : (
                            <span className="text-muted">Protected</span>
                          )}
                        </td>
                        <td className="text-center">
                          <Button
                            onClick={() => handleRemoveItem(index)}
                            size="small"
                            type="secondary"
                            style={{ padding: '0.25rem' }}
                            prefix={<Trash2 width={13} height={13} />}
                          />
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* Quick Add Fast Movers */}
          <div className="bw-box-subtle">
            <span className="bw-label">Quick 1-Tap Add (Top Sarees in Shop)</span>
            <div className="flex gap-2" style={{ flexWrap: 'wrap', marginTop: '0.4rem' }}>
              {products.slice(0, 4).map((p) => (
                <Button
                  key={p.id}
                  onClick={() => handleAddToCart(p)}
                  size="small"
                  type="secondary"
                  prefix={<Plus width={13} height={13} />}
                >
                  {p.code}: {p.name.split(',')[0]} ({formatINR(p.sellingPrice)})
                </Button>
              ))}
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN: BILL SUMMARY & CHECKOUT */}
        <div className="flex flex-col gap-4">
          <div className="bw-box flex flex-col gap-4">
            <h3 style={{ textTransform: 'uppercase', letterSpacing: '0.05em' }}>Bill Summary</h3>

            {/* Customer Details */}
            <div className="flex flex-col gap-2">
              <div>
                <label className="bw-label">Customer Name</label>
                <input
                  type="text"
                  className="bw-input"
                  placeholder="e.g. Smt. Kamala Devi"
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                />
              </div>
              <div>
                <label className="bw-label">Customer Mobile (For WhatsApp Bill)</label>
                <input
                  type="tel"
                  className="bw-input mono"
                  placeholder="e.g. 9876543210"
                  value={customerPhone}
                  onChange={(e) => setCustomerPhone(e.target.value)}
                />
              </div>
            </div>

            {/* Bill Level Discount (BL-4) */}
            <div>
              <div className="flex justify-between items-center">
                <label className="bw-label">Overall Bill Discount</label>
                <div className="flex gap-1" style={{ marginBottom: '4px' }}>
                  <Button
                    htmlType="button"
                    onClick={() => setDiscountType('FLAT')}
                    size="small"
                    type={discountType === 'FLAT' ? 'primary' : 'secondary'}
                    style={{ padding: '2px 6px', fontSize: '0.75rem' }}
                  >
                    ₹ Flat
                  </Button>
                  <Button
                    htmlType="button"
                    onClick={() => setDiscountType('PERCENT')}
                    size="small"
                    type={discountType === 'PERCENT' ? 'primary' : 'secondary'}
                    style={{ padding: '2px 6px', fontSize: '0.75rem' }}
                  >
                    %
                  </Button>
                </div>
              </div>
              <input
                type="number"
                min="0"
                className="bw-input mono"
                placeholder="0"
                value={billDiscount || ''}
                onChange={(e) => setBillDiscount(Math.max(0, parseFloat(e.target.value) || 0))}
              />
            </div>

            {/* Payment Mode (BL-6) */}
            <div>
              <label className="bw-label">Payment Mode</label>
              <div className="flex flex-wrap gap-2">
                {(['Cash', 'UPI', 'Card', 'Credit', 'Part'] as PaymentMode[]).map((mode) => (
                  <Button
                    key={mode}
                    htmlType="button"
                    onClick={() => setPaymentMode(mode)}
                    size="small"
                    type={paymentMode === mode ? 'primary' : 'secondary'}
                    prefix={
                      mode === 'Cash' ? <Banknote width={14} height={14} /> :
                      mode === 'UPI' ? <Smartphone width={14} height={14} /> :
                      mode === 'Card' ? <CreditCard width={14} height={14} /> :
                      mode === 'Credit' ? <UserCheck width={14} height={14} /> :
                      mode === 'Part' ? <span className="mono" style={{ fontSize: '0.75rem', fontWeight: 800 }}>½</span> : null
                    }
                  >
                    {mode}
                  </Button>
                ))}
              </div>

              {/* Part Payment Input */}
              {paymentMode === 'Part' && (
                <div style={{ marginTop: '0.5rem' }} className="bw-box-subtle">
                  <label className="bw-label">Amount Paid Now (₹ Cash/UPI) *</label>
                  <input
                    type="number"
                    min="0"
                    max={finalAmount}
                    className="bw-input mono"
                    placeholder="0"
                    value={amountPaidNow || ''}
                    onChange={(e) => setAmountPaidNow(Math.max(0, parseFloat(e.target.value) || 0))}
                  />
                  <div className="text-muted" style={{ fontSize: '0.75rem', marginTop: '0.25rem' }}>
                    Remaining added to Customer Udhaar:{' '}
                    <strong>{formatINR(Math.max(0, finalAmount - amountPaidNow))}</strong>
                  </div>
                </div>
              )}
            </div>

            {/* Totals Breakdown */}
            <div className="bw-box-subtle flex flex-col gap-2" style={{ fontSize: '0.9rem' }}>
              <div className="flex justify-between">
                <span className="text-muted">Total Pieces:</span>
                <span className="mono text-bold">{totalItemsCount} pcs</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted">Items Subtotal:</span>
                <span className="mono">{formatINR(subtotal)}</span>
              </div>
              {discountAmount > 0 && (
                <div className="flex justify-between">
                  <span className="text-muted">Discount Given:</span>
                  <span className="mono">-{formatINR(discountAmount)}</span>
                </div>
              )}
              <div
                className="flex justify-between items-center"
                style={{
                  borderTop: '2px solid #000',
                  paddingTop: '0.5rem',
                  fontSize: '1.25rem',
                  fontWeight: 800,
                }}
              >
                <span>Final Payable:</span>
                <span className="mono">{formatINR(finalAmount)}</span>
              </div>

              {/* Owner confidential profit pill */}
              {isOwner && (
                <div
                  className="bw-box flex items-center justify-between"
                  style={{
                    marginTop: '0.5rem',
                    background: isOverallLoss ? '#000' : '#FFF',
                    color: isOverallLoss ? '#FFF' : '#000',
                    border: '1px solid #000',
                    padding: '0.5rem 0.75rem',
                  }}
                >
                  <span style={{ fontSize: '0.75rem', textTransform: 'uppercase', fontWeight: 700 }}>
                    {isOverallLoss ? 'COUNTER GROSS LOSS' : 'COUNTER GROSS MARGIN'}
                  </span>
                  <span className="mono" style={{ fontWeight: 800, fontSize: '1.1rem' }}>
                    {isOverallLoss ? `-${formatINR(Math.abs(totalProfit))}` : `+${formatINR(totalProfit)}`}
                  </span>
                </div>
              )}
            </div>

            {/* Save & Generate Bill Button */}
            <Button
              onClick={handleSaveBill}
              disabled={saving || cartItems.length === 0}
              size="large"
              type="primary"
              loading={saving}
              fullWidth
            >
              {saving ? 'Creating Bill...' : `Save & Issue Bill (${formatINR(finalAmount)})`}
            </Button>
          </div>
        </div>
      </div>

      {/* Bill Receipt Dialog */}
      {completedBill && (
        <div className="bw-box flex items-center justify-between" style={{ background: '#000', color: '#FFF' }}>
          <div>
            <div style={{ fontWeight: 700, fontSize: '1.1rem' }}>
              ✓ Bill #{completedBill.billNo} Saved Successfully!
            </div>
            <div style={{ fontSize: '0.85rem' }}>
              Stock reduced automatically. Total {formatINR(completedBill.total)} ({completedBill.paymentMode}).
            </div>
          </div>
          <div className="flex gap-2">
            <Button
              onClick={() => {
                const itemsSummary = completedBill.items
                  .map((item, i) => `${i + 1}. ${item.productName} (${item.quantity} pc) - ₹${item.soldPrice * item.quantity}`)
                  .join('%0A');

                const message = `*INVOICE: ${shopName || 'Tela'}*%0A` +
                  `Date: ${new Date(completedBill.date).toLocaleDateString('en-IN')}%0A` +
                  `Customer: ${completedBill.customerName || 'Valued Customer'}%0A` +
                  `--------------------------------%0A` +
                  `${itemsSummary}%0A` +
                  `--------------------------------%0A` +
                  `*Total Paid: ₹${completedBill.total.toLocaleString('en-IN')}* (${completedBill.paymentMode})%0A%0A` +
                  `Thank you for shopping with us!`;

                const cleanPhone = completedBill.customerPhone?.replace(/[^0-9]/g, '') || '';
                const phonePath = cleanPhone ? `${cleanPhone.length === 10 ? '91' + cleanPhone : cleanPhone}` : '';
                window.open(`https://wa.me/${phonePath}?text=${message}`, '_blank');
              }}
              type="secondary"
              style={{ background: '#FFF', color: '#000' }}
            >
              Share WhatsApp
            </Button>
            <Button
              onClick={() => setCompletedBill(null)}
              type="primary"
              style={{ borderColor: '#FFF' }}
            >
              Start Next Bill
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};
