import React, { useState, useEffect } from 'react';
import {
  ThickArrowRightIcon as Truck,
  PlusIcon as Plus,
  MagnifyingGlassIcon as Search,
  ValueNoneIcon as DollarSign,
  CheckIcon as PackageCheck,
  MobileIcon as Phone,
  Component1Icon as MapPin,
  ReaderIcon as ReceiptText,
  ChevronLeftIcon as ChevronLeft,
  ChevronRightIcon as ChevronRight
} from '@radix-ui/react-icons';
import { BWModal } from '../common/BWModal';
import { Button } from '../ui/button';
import type { Supplier, PurchaseOrder, Product } from '../../types';
import { api } from '../../../../api/client/client';
import { formatINR, formatDate } from '../../utils/i18n';

interface SuppliersViewProps {
  suppliers: Supplier[];
  products: Product[];
  shopId: string;
  onRefreshData: () => Promise<void>;
}

export const SuppliersView: React.FC<SuppliersViewProps> = ({
  suppliers,
  products,
  shopId,
  onRefreshData,
}) => {
  const [activeTab, setActiveTab] = useState<'SUPPLIERS' | 'PURCHASES'>('SUPPLIERS');
  const [searchTerm, setSearchTerm] = useState('');

  // Purchases list state
  const [purchases, setPurchases] = useState<PurchaseOrder[]>([]);
  const [loadingPurchases, setLoadingPurchases] = useState(false);
  const [purchasePage, setPurchasePage] = useState(1);
  const [totalPurchasesCount, setTotalPurchasesCount] = useState(0);
  const [purchaseTotalPages, setPurchaseTotalPages] = useState(1);
  const [selectedSupplierFilter, setSelectedSupplierFilter] = useState<string>('');

  // Modals state
  const [isSupplierModalOpen, setIsSupplierModalOpen] = useState(false);
  const [supplierToEdit, setSupplierToEdit] = useState<Supplier | null>(null);
  const [isPurchaseModalOpen, setIsPurchaseModalOpen] = useState(false);
  const [isPayModalOpen, setIsPayModalOpen] = useState(false);
  const [activePoToPay, setActivePoToPay] = useState<PurchaseOrder | null>(null);

  // Supplier Form State
  const [suppName, setSuppName] = useState('');
  const [suppPhone, setSuppPhone] = useState('');
  const [suppAddress, setSuppAddress] = useState('');
  const [suppGst, setSuppGst] = useState('');
  const [suppNotes, setSuppNotes] = useState('');
  const [savingSupplier, setSavingSupplier] = useState(false);

  // Purchase Form State
  const [poSupplierId, setPoSupplierId] = useState('');
  const [poSupplierName, setPoSupplierName] = useState('');
  const [poProductId, setPoProductId] = useState('');
  const [poProductName, setPoProductName] = useState('');
  const [poQuantity, setPoQuantity] = useState<number>(10);
  const [poUnitCost, setPoUnitCost] = useState<number>(500);
  const [poAmountPaid, setPoAmountPaid] = useState<number>(5000);
  const [poDate, setPoDate] = useState(() => new Date().toISOString().substring(0, 10));
  const [poNotes, setPoNotes] = useState('');
  const [savingPurchase, setSavingPurchase] = useState(false);

  // Payment Form State
  const [payAmount, setPayAmount] = useState<number>(0);
  const [payNotes, setPayNotes] = useState('');
  const [savingPayment, setSavingPayment] = useState(false);

  // Load purchases list
  const loadPurchases = React.useCallback(async (page = 1, supplierId = '') => {
    setLoadingPurchases(true);
    try {
      const res = await api.purchases.getAll(shopId, {
        page,
        limit: 25,
        supplierId: supplierId || undefined,
      });
      setPurchases(res.data);
      setTotalPurchasesCount(res.total);
      setPurchasePage(res.page);
      setPurchaseTotalPages(res.totalPages);
    } catch (err) {
      console.error('Error loading purchases:', err);
    } finally {
      setLoadingPurchases(false);
    }
  }, [shopId]);

  useEffect(() => {
    if (activeTab === 'PURCHASES') {
      loadPurchases(purchasePage, selectedSupplierFilter);
    }
  }, [activeTab, purchasePage, selectedSupplierFilter, loadPurchases]);

  // Overall financial calculations
  const totalPurchasesAmount = suppliers.reduce((sum, s) => sum + (s.totalPurchases || 0), 0);
  const totalPaidAmount = suppliers.reduce((sum, s) => sum + (s.totalPaid || 0), 0);
  const totalBalanceDue = suppliers.reduce((sum, s) => sum + (s.balanceDue || 0), 0);

  // Filtered suppliers
  const filteredSuppliers = suppliers.filter(
    (s) =>
      s.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (s.phone && s.phone.includes(searchTerm)) ||
      (s.gstNumber && s.gstNumber.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  // Handle open add/edit supplier modal
  const handleOpenSupplierModal = (supp?: Supplier) => {
    if (supp) {
      setSupplierToEdit(supp);
      setSuppName(supp.name);
      setSuppPhone(supp.phone || '');
      setSuppAddress(supp.address || '');
      setSuppGst(supp.gstNumber || '');
      setSuppNotes(supp.notes || '');
    } else {
      setSupplierToEdit(null);
      setSuppName('');
      setSuppPhone('');
      setSuppAddress('');
      setSuppGst('');
      setSuppNotes('');
    }
    setIsSupplierModalOpen(true);
  };

  const handleSaveSupplier = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!suppName.trim()) {
      alert('Supplier name is required.');
      return;
    }
    setSavingSupplier(true);
    try {
      if (supplierToEdit) {
        await api.suppliers.update(supplierToEdit.id, {
          name: suppName.trim(),
          phone: suppPhone.trim() || undefined,
          address: suppAddress.trim() || undefined,
          gstNumber: suppGst.trim().toUpperCase() || undefined,
          notes: suppNotes.trim() || undefined,
        });
      } else {
        await api.suppliers.create({
          shopId,
          name: suppName.trim(),
          phone: suppPhone.trim() || undefined,
          address: suppAddress.trim() || undefined,
          gstNumber: suppGst.trim().toUpperCase() || undefined,
          notes: suppNotes.trim() || undefined,
        });
      }
      await onRefreshData();
      setIsSupplierModalOpen(false);
    } catch (err: any) {
      alert(err.message || 'Error saving supplier.');
    } finally {
      setSavingSupplier(false);
    }
  };

  const handleDeleteSupplier = async (supp: Supplier) => {
    if (!confirm(`Are you sure you want to delete supplier "${supp.name}"?`)) return;
    try {
      await api.suppliers.delete(supp.id);
      await onRefreshData();
    } catch (err: any) {
      alert(err.message || 'Error deleting supplier.');
    }
  };

  // Open New Purchase modal
  const handleOpenPurchaseModal = (supplier?: Supplier) => {
    if (supplier) {
      setPoSupplierId(supplier.id);
      setPoSupplierName(supplier.name);
    } else if (suppliers.length > 0) {
      setPoSupplierId(suppliers[0].id);
      setPoSupplierName(suppliers[0].name);
    } else {
      setPoSupplierId('');
      setPoSupplierName('');
    }

    if (products.length > 0) {
      setPoProductId(products[0].id);
      setPoProductName(products[0].name);
      setPoUnitCost(products[0].costPrice || 500);
      setPoQuantity(10);
      setPoAmountPaid((products[0].costPrice || 500) * 10);
    } else {
      setPoProductId('');
      setPoProductName('');
      setPoQuantity(10);
      setPoUnitCost(500);
      setPoAmountPaid(5000);
    }

    setPoDate(new Date().toISOString().substring(0, 10));
    setPoNotes('');
    setIsPurchaseModalOpen(true);
  };

  // Handle product dropdown selection in purchase modal
  const handleSelectProduct = (productId: string) => {
    setPoProductId(productId);
    const prod = products.find((p) => p.id === productId);
    if (prod) {
      setPoProductName(prod.name);
      setPoUnitCost(prod.costPrice || 0);
      setPoAmountPaid(poQuantity * (prod.costPrice || 0));
    }
  };

  // Handle supplier dropdown selection in purchase modal
  const handleSelectSupplier = (supplierId: string) => {
    setPoSupplierId(supplierId);
    const supp = suppliers.find((s) => s.id === supplierId);
    if (supp) {
      setPoSupplierName(supp.name);
    }
  };

  const poTotalCost = Math.max(0, poQuantity * poUnitCost);
  const poBalanceDue = Math.max(0, poTotalCost - poAmountPaid);

  const handleSavePurchase = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!poSupplierName.trim()) {
      alert('Please select or specify a supplier name.');
      return;
    }
    if (!poProductName.trim()) {
      alert('Please select or specify a product/saree name.');
      return;
    }
    if (poQuantity <= 0) {
      alert('Quantity must be greater than 0.');
      return;
    }

    setSavingPurchase(true);
    try {
      await api.purchases.create({
        supplierId: poSupplierId || undefined,
        supplierName: poSupplierName.trim(),
        productId: poProductId || undefined,
        productName: poProductName.trim(),
        quantity: poQuantity,
        unitCost: poUnitCost,
        amountPaid: poAmountPaid,
        date: poDate,
        notes: poNotes.trim() || undefined,
      });

      await onRefreshData();
      if (activeTab === 'PURCHASES') {
        await loadPurchases(1, selectedSupplierFilter);
      }
      setIsPurchaseModalOpen(false);
    } catch (err: any) {
      alert(err.message || 'Error recording purchase order.');
    } finally {
      setSavingPurchase(false);
    }
  };

  // Pay modal
  const handleOpenPayModal = (po: PurchaseOrder) => {
    setActivePoToPay(po);
    setPayAmount(po.balanceDue);
    setPayNotes('');
    setIsPayModalOpen(true);
  };

  const handleSavePayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activePoToPay || payAmount <= 0) return;

    setSavingPayment(true);
    try {
      await api.purchases.recordPayment(activePoToPay.id, payAmount, payNotes.trim() || undefined);
      await onRefreshData();
      if (activeTab === 'PURCHASES') {
        await loadPurchases(purchasePage, selectedSupplierFilter);
      }
      setIsPayModalOpen(false);
      setActivePoToPay(null);
    } catch (err: any) {
      alert(err.message || 'Error recording payment.');
    } finally {
      setSavingPayment(false);
    }
  };

  return (
    <div className="flex flex-col gap-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1>Suppliers & Purchases</h1>

        </div>
        <div className="flex items-center gap-2">
          <Button onClick={() => handleOpenPurchaseModal()} type="secondary" prefix={<PackageCheck width={16} height={16} />}>
            New Purchase Order
          </Button>
          <Button onClick={() => handleOpenSupplierModal()} type="primary" prefix={<Plus width={16} height={16} />}>
            Add Supplier
          </Button>
        </div>
      </div>

      {/* Overview Metric Boxes */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="bw-box">
          <span className="bw-label">Active Suppliers</span>
          <div className="mono" style={{ fontSize: '1.5rem', fontWeight: 800 }}>
            {suppliers.length} <span style={{ fontSize: '0.85rem', fontWeight: 500 }}>vendors</span>
          </div>
          <span className="text-muted" style={{ fontSize: '0.75rem' }}>Weavers & wholesale merchants</span>
        </div>

        <div className="bw-box">
          <span className="bw-label">Total Inward Purchases</span>
          <div className="mono" style={{ fontSize: '1.5rem', fontWeight: 800 }}>
            {formatINR(totalPurchasesAmount)}
          </div>
          <span className="text-muted" style={{ fontSize: '0.75rem' }}>Cumulative stock purchased</span>
        </div>

        <div className="bw-box">
          <span className="bw-label">Total Paid to Vendors</span>
          <div className="mono" style={{ fontSize: '1.5rem', fontWeight: 800 }}>
            {formatINR(totalPaidAmount)}
          </div>
          <span className="text-muted" style={{ fontSize: '0.75rem' }}>Settled payments</span>
        </div>

        <div className="bw-box" style={{ borderColor: totalBalanceDue > 0 ? '#000' : '#DDD', background: totalBalanceDue > 0 ? '#FAFAFA' : '#FFF' }}>
          <div className="flex justify-between items-center">
            <span className="bw-label">Pending Payables</span>
            {totalBalanceDue > 0 && (
              <span className="bw-badge bw-badge-loss" style={{ fontSize: '0.7rem' }}>
                OWED
              </span>
            )}
          </div>
          <div className="mono" style={{ fontSize: '1.5rem', fontWeight: 800, color: totalBalanceDue > 0 ? '#D32F2F' : '#000' }}>
            {formatINR(totalBalanceDue)}
          </div>
          <span className="text-muted" style={{ fontSize: '0.75rem' }}>Balance owed to suppliers</span>
        </div>
      </div>

      {/* Sub Tabs */}
      <div className="flex gap-2" style={{ borderBottom: '2px solid #000', paddingBottom: '0.5rem' }}>
        <Button
          onClick={() => setActiveTab('SUPPLIERS')}
          type={activeTab === 'SUPPLIERS' ? 'primary' : 'secondary'}
          size="small"
          prefix={<Truck width={14} height={14} />}
        >
          Suppliers Directory ({suppliers.length})
        </Button>
        <Button
          onClick={() => setActiveTab('PURCHASES')}
          type={activeTab === 'PURCHASES' ? 'primary' : 'secondary'}
          size="small"
          prefix={<ReceiptText width={14} height={14} />}
        >
          Purchase Orders & Restocking
        </Button>
      </div>

      {/* TAB 1: SUPPLIERS DIRECTORY */}
      {activeTab === 'SUPPLIERS' && (
        <div className="flex flex-col gap-3">
          {/* Search bar */}
          <div className="flex items-center gap-2">
            <div className="relative flex-1">
              <input
                type="text"
                className="bw-input"
                placeholder="Search suppliers by name, phone, or GST number..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                style={{ paddingLeft: '2rem' }}
              />
              <Search width={14} height={14} className="text-muted" style={{ position: 'absolute', left: '0.6rem', top: '50%', transform: 'translateY(-50%)' }} />
            </div>
            {searchTerm && (
              <Button onClick={() => setSearchTerm('')} type="secondary" size="small">
                Clear
              </Button>
            )}
          </div>

          {/* Suppliers Table */}
          <div className="bw-box" style={{ padding: 0, overflowX: 'auto' }}>
            <table className="bw-table">
              <thead>
                <tr>
                  <th>Supplier / Weaver</th>
                  <th>Contact Info</th>
                  <th>GST Number</th>
                  <th className="text-right">Total Purchases</th>
                  <th className="text-right">Total Paid</th>
                  <th className="text-right">Balance Due</th>
                  <th className="text-center">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredSuppliers.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="text-center" style={{ padding: '3rem' }}>
                      <div style={{ fontWeight: 700, fontSize: '1.1rem' }}>No suppliers found</div>
                      <p className="text-muted" style={{ fontSize: '0.85rem', marginTop: '0.25rem' }}>
                        Click "Add Supplier" to record your first vendor or weaver ledger.
                      </p>
                    </td>
                  </tr>
                ) : (
                  filteredSuppliers.map((supp) => {
                    const balance = supp.balanceDue || 0;
                    return (
                      <tr key={supp.id}>
                        <td>
                          <div style={{ fontWeight: 700, fontSize: '0.95rem' }}>{supp.name}</div>
                          {supp.notes && (
                            <div className="text-muted" style={{ fontSize: '0.75rem' }}>
                              {supp.notes}
                            </div>
                          )}
                        </td>
                        <td>
                          {supp.phone ? (
                            <div className="flex items-center gap-1 mono" style={{ fontSize: '0.85rem' }}>
                              <Phone width={12} height={12} className="text-muted" /> {supp.phone}
                            </div>
                          ) : (
                            <span className="text-muted" style={{ fontSize: '0.8rem' }}>No phone</span>
                          )}
                          {supp.address && (
                            <div className="flex items-center gap-1 text-muted" style={{ fontSize: '0.75rem', marginTop: '2px' }}>
                              <MapPin width={11} height={11} /> {supp.address}
                            </div>
                          )}
                        </td>
                        <td>
                          {supp.gstNumber ? (
                            <span className="bw-badge mono" style={{ fontSize: '0.75rem' }}>
                              {supp.gstNumber}
                            </span>
                          ) : (
                            <span className="text-muted" style={{ fontSize: '0.75rem' }}>Unregistered</span>
                          )}
                        </td>
                        <td className="text-right mono">
                          {formatINR(supp.totalPurchases || 0)}
                        </td>
                        <td className="text-right mono">
                          {formatINR(supp.totalPaid || 0)}
                        </td>
                        <td className="text-right mono">
                          {balance > 0 ? (
                            <span style={{ fontWeight: 800, color: '#D32F2F' }}>
                              {formatINR(balance)}
                            </span>
                          ) : (
                            <span className="text-muted">₹0 (Clear)</span>
                          )}
                        </td>
                        <td>
                          <div className="flex items-center justify-center gap-1">
                            <Button
                              onClick={() => handleOpenPurchaseModal(supp)}
                              type="secondary"
                              size="small"
                              title="Record Restock / Purchase from this supplier"
                              prefix={<PackageCheck width={12} height={12} />}
                            >
                              Restock
                            </Button>
                            <Button
                              onClick={() => handleOpenSupplierModal(supp)}
                              type="secondary"
                              size="small"
                              title="Edit Supplier"
                            >
                              Edit
                            </Button>
                            <Button
                              onClick={() => handleDeleteSupplier(supp)}
                              type="secondary"
                              size="small"
                              title="Delete Supplier"
                            >
                              Delete
                            </Button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 2: PURCHASE ORDERS / RESTOCKING LEDGER */}
      {activeTab === 'PURCHASES' && (
        <div className="flex flex-col gap-3">
          {/* Filter Bar */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-muted" style={{ fontSize: '0.85rem' }}>Filter by Supplier:</span>
              <select
                className="bw-select mono"
                style={{ width: 'auto', padding: '4px 8px', fontSize: '0.85rem' }}
                value={selectedSupplierFilter}
                onChange={(e) => {
                  setSelectedSupplierFilter(e.target.value);
                  setPurchasePage(1);
                }}
              >
                <option value="">All Suppliers ({suppliers.length})</option>
                {suppliers.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex items-center gap-2">
              <Button
                onClick={() => setPurchasePage((p) => Math.max(1, p - 1))}
                disabled={purchasePage <= 1}
                type="secondary"
                size="small"
                prefix={<ChevronLeft width={14} height={14} />}
              >
                Prev
              </Button>
              <span className="mono" style={{ fontSize: '0.85rem' }}>
                Page {purchasePage} of {purchaseTotalPages || 1} ({totalPurchasesCount} orders)
              </span>
              <Button
                onClick={() => setPurchasePage((p) => Math.min(purchaseTotalPages, p + 1))}
                disabled={purchasePage >= purchaseTotalPages}
                type="secondary"
                size="small"
                suffix={<ChevronRight width={14} height={14} />}
              >
                Next
              </Button>
            </div>
          </div>

          {/* Purchases Table */}
          <div className="bw-box" style={{ padding: 0, overflowX: 'auto' }}>
            <table className="bw-table">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>PO #</th>
                  <th>Supplier</th>
                  <th>Item Restocked</th>
                  <th className="text-right">Qty (pcs)</th>
                  <th className="text-right">Unit Cost</th>
                  <th className="text-right">Total Cost</th>
                  <th className="text-right">Amount Paid</th>
                  <th className="text-right">Balance Due</th>
                  <th className="text-center">Action</th>
                </tr>
              </thead>
              <tbody>
                {loadingPurchases ? (
                  <tr>
                    <td colSpan={10} className="text-center" style={{ padding: '2rem' }}>
                      Loading purchase orders...
                    </td>
                  </tr>
                ) : purchases.length === 0 ? (
                  <tr>
                    <td colSpan={10} className="text-center" style={{ padding: '3rem' }}>
                      <div style={{ fontWeight: 700, fontSize: '1.1rem' }}>No purchase orders recorded</div>
                      <p className="text-muted" style={{ fontSize: '0.85rem', marginTop: '0.25rem' }}>
                        Click "New Purchase Order" to log incoming inventory and track payables.
                      </p>
                    </td>
                  </tr>
                ) : (
                  purchases.map((po) => {
                    const isDue = po.balanceDue > 0;
                    return (
                      <tr key={po.id}>
                        <td className="mono" style={{ fontSize: '0.85rem' }}>
                          {formatDate(po.date)}
                        </td>
                        <td className="mono" style={{ fontWeight: 700 }}>
                          #{po.id.slice(-6).toUpperCase()}
                        </td>
                        <td>
                          <div style={{ fontWeight: 600 }}>{po.supplierName}</div>
                        </td>
                        <td>
                          <div>{po.productName}</div>
                          {po.notes && (
                            <div className="text-muted" style={{ fontSize: '0.75rem' }}>
                              {po.notes}
                            </div>
                          )}
                        </td>
                        <td className="text-right mono" style={{ fontWeight: 700 }}>
                          +{po.quantity}
                        </td>
                        <td className="text-right mono">
                          {formatINR(po.unitCost)}
                        </td>
                        <td className="text-right mono" style={{ fontWeight: 700 }}>
                          {formatINR(po.totalCost)}
                        </td>
                        <td className="text-right mono">
                          {formatINR(po.amountPaid)}
                        </td>
                        <td className="text-right mono">
                          {isDue ? (
                            <span style={{ fontWeight: 800, color: '#D32F2F' }}>
                              {formatINR(po.balanceDue)}
                            </span>
                          ) : (
                            <span className="bw-badge bw-badge-black" style={{ fontSize: '0.7rem' }}>
                              PAID
                            </span>
                          )}
                        </td>
                        <td className="text-center">
                          {isDue ? (
                            <Button
                              onClick={() => handleOpenPayModal(po)}
                              type="primary"
                              size="small"
                              title="Record payment towards this purchase order"
                              prefix={<DollarSign width={12} height={12} />}
                            >
                              Pay
                            </Button>
                          ) : (
                            <span className="text-muted" style={{ fontSize: '0.75rem' }}>Settled</span>
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
      )}

      {/* MODAL 1: ADD / EDIT SUPPLIER */}
      <BWModal
        isOpen={isSupplierModalOpen}
        onClose={() => setIsSupplierModalOpen(false)}
        title={supplierToEdit ? 'Edit Supplier' : 'Add New Supplier / Weaver'}
        maxWidth="520px"
      >
        <form onSubmit={handleSaveSupplier} className="flex flex-col gap-3">
          <div>
            <label className="bw-label">Supplier / Business Name *</label>
            <input
              type="text"
              className="bw-input"
              placeholder="e.g. Sri Balaji Silks, Kanchipuram"
              value={suppName}
              onChange={(e) => setSuppName(e.target.value)}
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="bw-label">Phone Number</label>
              <input
                type="text"
                className="bw-input mono"
                placeholder="e.g. 9876543210"
                value={suppPhone}
                onChange={(e) => setSuppPhone(e.target.value)}
              />
            </div>
            <div>
              <label className="bw-label">GSTIN (Optional)</label>
              <input
                type="text"
                className="bw-input mono"
                placeholder="22AAAAA0000A1Z5"
                value={suppGst}
                onChange={(e) => setSuppGst(e.target.value)}
              />
            </div>
          </div>

          <div>
            <label className="bw-label">Address / City</label>
            <input
              type="text"
              className="bw-input"
              placeholder="e.g. 14 Weaver Street, Varanasi, UP"
              value={suppAddress}
              onChange={(e) => setSuppAddress(e.target.value)}
            />
          </div>

          <div>
            <label className="bw-label">Notes & Specialities</label>
            <textarea
              className="bw-input"
              rows={2}
              placeholder="e.g. Pure Banarasi silk specialist, net 30 credit terms"
              value={suppNotes}
              onChange={(e) => setSuppNotes(e.target.value)}
            />
          </div>

          <div className="flex justify-between items-center" style={{ marginTop: '0.5rem', paddingTop: '0.75rem', borderTop: '1.5px solid #000' }}>
            <Button htmlType="button" onClick={() => setIsSupplierModalOpen(false)} type="secondary">
              Cancel
            </Button>
            <Button htmlType="submit" disabled={savingSupplier} type="primary" loading={savingSupplier}>
              {savingSupplier ? 'Saving...' : supplierToEdit ? 'Update Supplier' : 'Save Supplier'}
            </Button>
          </div>
        </form>
      </BWModal>

      {/* MODAL 2: RECORD NEW PURCHASE ORDER */}
      <BWModal
        isOpen={isPurchaseModalOpen}
        onClose={() => setIsPurchaseModalOpen(false)}
        title="Record Purchase Order (Restocking)"
        maxWidth="640px"
      >
        <form onSubmit={handleSavePurchase} className="flex flex-col gap-3">
          {/* Supplier Picker */}
          <div>
            <label className="bw-label">Supplier / Weaver *</label>
            {suppliers.length > 0 ? (
              <div className="flex gap-2">
                <select
                  className="bw-select flex-1"
                  value={poSupplierId}
                  onChange={(e) => handleSelectSupplier(e.target.value)}
                >
                  <option value="">Select Existing Supplier...</option>
                  {suppliers.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name} {s.phone ? `(${s.phone})` : ''}
                    </option>
                  ))}
                </select>
                <input
                  type="text"
                  className="bw-input flex-1"
                  placeholder="Or enter new supplier name"
                  value={poSupplierName}
                  onChange={(e) => {
                    setPoSupplierName(e.target.value);
                    setPoSupplierId('');
                  }}
                  required
                />
              </div>
            ) : (
              <input
                type="text"
                className="bw-input"
                placeholder="Enter supplier / weaver name"
                value={poSupplierName}
                onChange={(e) => setPoSupplierName(e.target.value)}
                required
              />
            )}
          </div>

          {/* Product Picker */}
          <div>
            <label className="bw-label">Product / Saree to Restock *</label>
            {products.length > 0 ? (
              <div className="flex gap-2">
                <select
                  className="bw-select flex-1"
                  value={poProductId}
                  onChange={(e) => handleSelectProduct(e.target.value)}
                >
                  <option value="">Select Existing Product to Restock...</option>
                  {products.map((p) => (
                    <option key={p.id} value={p.id}>
                      [{p.code}] {p.name} (Current Stock: {p.quantity} pcs)
                    </option>
                  ))}
                </select>
                <input
                  type="text"
                  className="bw-input flex-1"
                  placeholder="Or custom item name"
                  value={poProductName}
                  onChange={(e) => {
                    setPoProductName(e.target.value);
                    setPoProductId('');
                  }}
                  required
                />
              </div>
            ) : (
              <input
                type="text"
                className="bw-input"
                placeholder="Product or Saree design name"
                value={poProductName}
                onChange={(e) => setPoProductName(e.target.value)}
                required
              />
            )}
            {poProductId && (
              <p className="text-muted" style={{ fontSize: '0.75rem', marginTop: '0.2rem' }}>
                Stock will be automatically increased upon creating this purchase order.
              </p>
            )}
          </div>

          {/* Quantity and Unit Cost */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="bw-label">Quantity Received (pieces) *</label>
              <input
                type="number"
                min="1"
                className="bw-input mono"
                value={poQuantity}
                onChange={(e) => {
                  const qty = Math.max(1, parseInt(e.target.value) || 1);
                  setPoQuantity(qty);
                  setPoAmountPaid(qty * poUnitCost);
                }}
                required
              />
            </div>
            <div>
              <label className="bw-label">Unit Purchase Cost (₹ / piece) *</label>
              <input
                type="number"
                min="0"
                className="bw-input mono"
                value={poUnitCost}
                onChange={(e) => {
                  const cost = Math.max(0, parseFloat(e.target.value) || 0);
                  setPoUnitCost(cost);
                  setPoAmountPaid(poQuantity * cost);
                }}
                required
              />
            </div>
          </div>

          {/* Amount Paid & Calculation Summary */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="bw-label">Amount Paid Upfront (₹)</label>
              <input
                type="number"
                min="0"
                max={poTotalCost}
                className="bw-input mono"
                value={poAmountPaid}
                onChange={(e) => setPoAmountPaid(Math.min(poTotalCost, Math.max(0, parseFloat(e.target.value) || 0)))}
              />
              <div className="flex gap-2" style={{ marginTop: '0.25rem' }}>
                <Button
                  htmlType="button"
                  onClick={() => setPoAmountPaid(poTotalCost)}
                  type="secondary"
                  size="tiny"
                >
                  Full Paid
                </Button>
                <Button
                  htmlType="button"
                  onClick={() => setPoAmountPaid(0)}
                  type="secondary"
                  size="tiny"
                >
                  Full Credit (0)
                </Button>
              </div>
            </div>
            <div>
              <label className="bw-label">Purchase Date</label>
              <input
                type="date"
                className="bw-input mono"
                value={poDate}
                onChange={(e) => setPoDate(e.target.value)}
              />
            </div>
          </div>

          {/* Cost Summary Box */}
          <div
            className="flex items-center justify-between"
            style={{ padding: '0.75rem', border: '1.5px solid #000', background: '#FAFAFA' }}
          >
            <div>
              <div style={{ fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase' }}>
                Order Valuation
              </div>
              <div style={{ fontSize: '0.85rem' }}>
                Total Order Cost: <strong className="mono">{formatINR(poTotalCost)}</strong>
              </div>
            </div>
            <div className="text-right">
              <span
                className={`bw-badge ${poBalanceDue > 0 ? 'bw-badge-loss' : 'bw-badge-black'} mono`}
                style={{ fontSize: '0.85rem' }}
              >
                {poBalanceDue > 0 ? `Balance Due: ${formatINR(poBalanceDue)}` : 'Fully Paid'}
              </span>
            </div>
          </div>

          {/* Notes */}
          <div>
            <label className="bw-label">Notes / Challan Number</label>
            <input
              type="text"
              className="bw-input"
              placeholder="e.g. Challan #8841, delivered via VRL Logistics"
              value={poNotes}
              onChange={(e) => setPoNotes(e.target.value)}
            />
          </div>

          <div className="flex justify-between items-center" style={{ marginTop: '0.5rem', paddingTop: '0.75rem', borderTop: '1.5px solid #000' }}>
            <Button htmlType="button" onClick={() => setIsPurchaseModalOpen(false)} type="secondary">
              Cancel
            </Button>
            <Button htmlType="submit" disabled={savingPurchase} type="primary" loading={savingPurchase}>
              {savingPurchase ? 'Recording Order...' : 'Confirm & Inward Stock'}
            </Button>
          </div>
        </form>
      </BWModal>

      {/* MODAL 3: PAY SUPPLIER */}
      <BWModal
        isOpen={isPayModalOpen}
        onClose={() => {
          setIsPayModalOpen(false);
          setActivePoToPay(null);
        }}
        title={`Record Payment to ${activePoToPay?.supplierName || 'Supplier'}`}
        maxWidth="460px"
      >
        <form onSubmit={handleSavePayment} className="flex flex-col gap-3">
          <div className="bw-box-subtle">
            <div style={{ fontSize: '0.85rem' }}>
              Order: <strong>#{activePoToPay?.id.slice(-6).toUpperCase()}</strong> ({activePoToPay?.productName})
            </div>
            <div style={{ fontSize: '0.85rem', marginTop: '2px' }}>
              Pending Balance: <strong className="mono" style={{ color: '#D32F2F' }}>{formatINR(activePoToPay?.balanceDue || 0)}</strong>
            </div>
          </div>

          <div>
            <label className="bw-label">Payment Amount (₹) *</label>
            <input
              type="number"
              min="1"
              max={activePoToPay?.balanceDue || undefined}
              className="bw-input mono"
              value={payAmount}
              onChange={(e) => setPayAmount(Math.max(0, parseFloat(e.target.value) || 0))}
              required
            />
          </div>

          <div>
            <label className="bw-label">Payment Notes (Optional)</label>
            <input
              type="text"
              className="bw-input"
              placeholder="e.g. UPI Ref #4089201, Bank Transfer"
              value={payNotes}
              onChange={(e) => setPayNotes(e.target.value)}
            />
          </div>

          <div className="flex justify-between items-center" style={{ marginTop: '0.5rem', paddingTop: '0.75rem', borderTop: '1.5px solid #000' }}>
            <Button
              htmlType="button"
              onClick={() => {
                setIsPayModalOpen(false);
                setActivePoToPay(null);
              }}
              type="secondary"
            >
              Cancel
            </Button>
            <Button htmlType="submit" disabled={savingPayment} type="primary" loading={savingPayment}>
              {savingPayment ? 'Processing...' : `Pay ${formatINR(payAmount)}`}
            </Button>
          </div>
        </form>
      </BWModal>
    </div>
  );
};
