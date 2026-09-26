import { formatINR } from '../../utils/i18n';
import React, { useState, useEffect } from 'react';
import {
  ChatBubbleIcon as MessageSquare,
  PlusIcon as Plus,
  MagnifyingGlassIcon as Search,
  UpdateIcon as History,
  ChevronLeftIcon as ChevronLeft,
  ChevronRightIcon as ChevronRight
} from '@radix-ui/react-icons';
import { Button } from '../ui/button';
import { DotmSquare4 } from '../ui/dotm-square-4';
import { DynamicLoadingText } from '../ui/dynamic-loading-text';
import { BWModal } from '../common/BWModal';
import type { Customer, CustomerTransaction } from '../../types';
import { api } from '../../../../api/client/client';
interface CustomersViewProps {
  customers: Customer[];
  shopName: string;
  shopId?: string;
  onAddCustomer: (customer: Omit<Customer, 'id' | 'totalSpent'>) => Promise<void>;
  onRecordPayment: (customerId: string, paymentAmount: number, notes?: string) => Promise<void>;
  onAddCredit: (customerId: string, creditAmount: number, notes?: string) => Promise<void>;
}

export const CustomersView: React.FC<CustomersViewProps> = ({
  customers,
  shopName,
  shopId,
  onAddCustomer,
  onRecordPayment,
  onAddCredit,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [activeCustomer, setActiveCustomer] = useState<Customer | null>(null);
  const [actionType, setActionType] = useState<'PAYMENT' | 'CREDIT'>('PAYMENT');
  const [amount, setAmount] = useState<number>(0);
  const [notes, setNotes] = useState('');

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(customers.length);
  const [customerList, setCustomerList] = useState<Customer[]>(customers);
  const [loadingList, setLoadingList] = useState(false);

  // Sync when shopId or props change
  useEffect(() => {
    if (!shopId) {
      setCustomerList(customers);
      setTotalCount(customers.length);
      setTotalPages(1);
      return;
    }

    let isCancelled = false;
    const fetchPage = async () => {
      setLoadingList(true);
      try {
        const res = await api.customers.getByShop(shopId, {
          page: currentPage,
          limit: 25,
          search: searchTerm.trim() || undefined,
        });
        if (!isCancelled) {
          setCustomerList(res.data);
          setTotalCount(res.total);
          setTotalPages(res.totalPages);
        }
      } catch (err) {
        console.error('Error fetching customers page:', err);
      } finally {
        if (!isCancelled) setLoadingList(false);
      }
    };

    const timer = setTimeout(fetchPage, searchTerm ? 300 : 0);
    return () => {
      isCancelled = true;
      clearTimeout(timer);
    };
  }, [shopId, currentPage, searchTerm, customers]);

  const refreshCurrentPage = async () => {
    if (!shopId) return;
    try {
      const res = await api.customers.getByShop(shopId, {
        page: currentPage,
        limit: 25,
        search: searchTerm.trim() || undefined,
      });
      setCustomerList(res.data);
      setTotalCount(res.total);
      setTotalPages(res.totalPages);
    } catch (err) {
      console.error('Error refreshing customers:', err);
    }
  };

  // Transaction History State
  const [historyCustomer, setHistoryCustomer] = useState<Customer | null>(null);
  const [historyTransactions, setHistoryTransactions] = useState<CustomerTransaction[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);

  // New Customer State
  const [newName, setNewName] = useState('');
  const [newPhone, setNewPhone] = useState('');
  const [initialBalance, setInitialBalance] = useState(0);

  const displayedCustomers = shopId
    ? customerList
    : customerList.filter(
        (c) =>
          c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
          c.phone.includes(searchTerm)
      );

  const totalOutstandingUdhaar = customers.reduce((acc, c) => acc + c.balanceDue, 0);

  const handleSendReminder = (customer: Customer) => {
    if (customer.balanceDue <= 0) {
      alert(`${customer.name} has no pending balance due.`);
      return;
    }
    const cleanPhone = customer.phone.replace(/[^0-9]/g, '');
    const phone = cleanPhone.length === 10 ? `91${cleanPhone}` : cleanPhone;
    const msg = `Namaste ${customer.name} ji,%0A` +
      `This is a gentle reminder from *${shopName}*.%0A` +
      `Your current pending credit balance is *${formatINR(customer.balanceDue)}*.%0A` +
      `Kindly arrange for payment at your earliest convenience.%0A` +
      `Thank you!`;
    window.open(`https://wa.me/${phone}?text=${msg}`, '_blank');
  };

  const handleCreateCustomer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim() || !newPhone.trim()) {
      alert('Name and phone number are required.');
      return;
    }
    await onAddCustomer({
      shopId: shopId || 'current',
      name: newName.trim(),
      phone: newPhone.trim(),
      balanceDue: Number(initialBalance) || 0,
    });
    setNewName('');
    setNewPhone('');
    setInitialBalance(0);
    setIsAddModalOpen(false);
    await refreshCurrentPage();
  };

  const handleProcessTransaction = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeCustomer || amount <= 0) return;

    if (actionType === 'PAYMENT') {
      await onRecordPayment(activeCustomer.id, amount, notes.trim() || undefined);
    } else {
      await onAddCredit(activeCustomer.id, amount, notes.trim() || undefined);
    }
    setActiveCustomer(null);
    setAmount(0);
    setNotes('');
    await refreshCurrentPage();
  };

  const handleOpenHistory = async (customer: Customer) => {
    setHistoryCustomer(customer);
    setLoadingHistory(true);
    try {
      const txs = await api.customers.getTransactions(customer.id);
      setHistoryTransactions(txs);
    } catch (err) {
      console.error(err);
      setHistoryTransactions([]);
    } finally {
      setLoadingHistory(false);
    }
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1>Customers</h1>

        </div>
        <Button onClick={() => setIsAddModalOpen(true)} type="primary" prefix={<Plus width={16} height={16} />}>
          Add New Customer
        </Button>
      </div>

      {/* Summary Box */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="bw-box">
          <span className="bw-label">Total Outstanding Credit (Udhaar)</span>
          <div className="mono" style={{ fontSize: '1.75rem', fontWeight: 800 }}>
            {formatINR(totalOutstandingUdhaar)}
          </div>
          <span className="text-muted" style={{ fontSize: '0.75rem' }}>Money to collect from customers</span>
        </div>
        <div className="bw-box">
          <span className="bw-label">Total Customers Registered</span>
          <div className="mono" style={{ fontSize: '1.75rem', fontWeight: 800 }}>
            {totalCount}
          </div>
          <span className="text-muted" style={{ fontSize: '0.75rem' }}>In shop address book</span>
        </div>
        <div className="bw-box">
          <span className="bw-label">Customers with Credit Due</span>
          <div className="mono" style={{ fontSize: '1.75rem', fontWeight: 800 }}>
            {customerList.filter((c) => c.balanceDue > 0).length}
          </div>
          <span className="text-muted" style={{ fontSize: '0.75rem' }}>Pending payment (current view)</span>
        </div>
      </div>

      {/* Search Bar & Pagination Controls */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div className="bw-box-subtle flex-1 flex items-center gap-2">
          <Search width={16} height={16} className="text-muted" />
          <input
            type="text"
            className="bw-input"
            style={{ border: 'none', background: 'transparent', padding: '0.2rem' }}
            placeholder="Search by customer name or phone number..."
            value={searchTerm}
            onChange={(e) => {
              setSearchTerm(e.target.value);
              setCurrentPage(1);
            }}
          />
          {searchTerm && (
            <Button
              onClick={() => setSearchTerm('')}
              type="secondary"
              size="tiny"
            >
              Clear
            </Button>
          )}
        </div>

        {totalPages > 1 && (
          <div className="flex flex-wrap items-center justify-between gap-2">
            <Button
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              disabled={currentPage <= 1 || loadingList}
              type="secondary"
              size="small"
              prefix={<ChevronLeft width={14} height={14} />}
            >
              Prev
            </Button>
            <span className="mono" style={{ fontSize: '0.85rem' }}>
              Page {currentPage} of {totalPages}
            </span>
            <Button
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              disabled={currentPage >= totalPages || loadingList}
              type="secondary"
              size="small"
              suffix={<ChevronRight width={14} height={14} />}
            >
              Next
            </Button>
          </div>
        )}
      </div>

      {/* Customer List Table */}
      <div style={{ border: '1.5px solid #000', overflowX: 'auto' }}>
        <table className="bw-table">
          <thead>
            <tr>
              <th>Customer Name</th>
              <th>Phone Number</th>
              <th className="text-right">Total Spent (₹)</th>
              <th className="text-right">Pending Credit (Udhaar)</th>
              <th className="text-center">Actions</th>
            </tr>
          </thead>
          <tbody>
            {loadingList ? (
              <tr>
                <td colSpan={5} className="text-center" style={{ padding: '2rem' }}>
                  <div className="flex flex-col items-center gap-3">
                    <DotmSquare4 size={32} dotSize={4} speed={1.35} />
                    <DynamicLoadingText phrases={['Loading customer ledger...', 'Checking credit balances...', 'Fetching past transactions...', 'Opening the registers...']} />
                  </div>
                </td>
              </tr>
            ) : displayedCustomers.length === 0 ? (
              <tr>
                <td colSpan={5} className="text-center" style={{ padding: '2rem' }}>
                  No customer records found.
                </td>
              </tr>
            ) : (
              displayedCustomers.map((customer) => (
                <tr key={customer.id}>
                  <td style={{ fontWeight: 700 }}>{customer.name}</td>
                  <td className="mono">{customer.phone}</td>
                  <td className="text-right mono">{formatINR(customer.totalSpent)}</td>
                  <td className="text-right mono">
                    {customer.balanceDue > 0 ? (
                      <span className="bw-badge bw-badge-loss">
                        {formatINR(customer.balanceDue)} DUE
                      </span>
                    ) : (
                      <span className="text-muted">₹0 (Clear)</span>
                    )}
                  </td>
                  <td>
                    <div className="flex items-center justify-center gap-2">
                      <Button
                        onClick={() => handleOpenHistory(customer)}
                        type="secondary"
                        size="small"
                        title="View chronological ledger audit history"
                        prefix={<History width={13} height={13} />}
                      >
                        Ledger History
                      </Button>
                      <Button
                        onClick={() => {
                          setActiveCustomer(customer);
                          setActionType('PAYMENT');
                        }}
                        type="secondary"
                        size="small"
                        title="Record payment received"
                      >
                        Payment
                      </Button>
                      <Button
                        onClick={() => {
                          setActiveCustomer(customer);
                          setActionType('CREDIT');
                        }}
                        type="secondary"
                        size="small"
                        title="Add udhaar credit"
                      >
                        Credit
                      </Button>
                      {customer.balanceDue > 0 && (
                        <Button
                          onClick={() => handleSendReminder(customer)}
                          type="primary"
                          size="small"
                          title="Send payment reminder on WhatsApp"
                          prefix={<MessageSquare width={13} height={13} />}
                        >
                          WhatsApp
                        </Button>
                      )}
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Add Customer Modal */}
      <BWModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        title="Add Customer to Directory"
        maxWidth="480px"
      >
        <form onSubmit={handleCreateCustomer} className="flex flex-col gap-3">
          <div>
            <label className="bw-label">Customer Name *</label>
            <input
              type="text"
              required
              className="bw-input"
              placeholder="e.g. Smt. Meenakshi Sundaram"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
            />
          </div>
          <div>
            <label className="bw-label">Phone Number *</label>
            <input
              type="tel"
              required
              className="bw-input mono"
              placeholder="e.g. 9845012345"
              value={newPhone}
              onChange={(e) => setNewPhone(e.target.value)}
            />
          </div>
          <div>
            <label className="bw-label">Existing Opening Credit Due (₹)</label>
            <input
              type="number"
              min="0"
              className="bw-input mono"
              value={initialBalance}
              onChange={(e) => setInitialBalance(parseFloat(e.target.value) || 0)}
            />
          </div>
          <div className="flex justify-end gap-2" style={{ marginTop: '0.5rem' }}>
            <Button htmlType="button" onClick={() => setIsAddModalOpen(false)} type="secondary">
              Cancel
            </Button>
            <Button htmlType="submit" type="primary">
              Save Customer
            </Button>
          </div>
        </form>
      </BWModal>

      {/* Payment / Credit Modal */}
      {activeCustomer && (
        <BWModal
          isOpen={true}
          onClose={() => setActiveCustomer(null)}
          title={actionType === 'PAYMENT' ? `Record Payment from ${activeCustomer.name}` : `Add Credit for ${activeCustomer.name}`}
          maxWidth="450px"
        >
          <form onSubmit={handleProcessTransaction} className="flex flex-col gap-3">
            <div className="bw-box-subtle">
              <span className="bw-label">Current Outstanding Due:</span>
              <div className="mono" style={{ fontSize: '1.25rem', fontWeight: 800 }}>
                {formatINR(activeCustomer.balanceDue)}
              </div>
            </div>

            <div>
              <label className="bw-label">
                Amount to {actionType === 'PAYMENT' ? 'Receive (Reduces Due)' : 'Add to Credit (Increases Due)'} (₹) *
              </label>
              <input
                type="number"
                min="1"
                required
                className="bw-input mono"
                placeholder="₹"
                value={amount || ''}
                onChange={(e) => setAmount(parseFloat(e.target.value) || 0)}
                autoFocus
              />
            </div>

            <div>
              <label className="bw-label">Notes (Optional)</label>
              <input
                type="text"
                className="bw-input"
                placeholder="e.g. Received via PhonePe / Cash / Diwail advance"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
              />
            </div>

            <div className="flex justify-between items-center" style={{ marginTop: '0.5rem' }}>
              <Button htmlType="button" onClick={() => setActiveCustomer(null)} type="secondary">
                Cancel
              </Button>
              <Button htmlType="submit" type="primary">
                Confirm {actionType === 'PAYMENT' ? 'Payment' : 'Credit'}
              </Button>
            </div>
          </form>
        </BWModal>
      )}

      {/* Ledger History Modal */}
      {historyCustomer && (
        <BWModal
          isOpen={true}
          onClose={() => setHistoryCustomer(null)}
          title={`Udhaar Ledger History: ${historyCustomer.name} (${historyCustomer.phone})`}
          maxWidth="680px"
        >
          <div className="flex flex-col gap-3">
            <div className="bw-box-subtle flex justify-between items-center">
              <div>
                <span className="bw-label">Current Balance Due</span>
                <div className="mono" style={{ fontSize: '1.4rem', fontWeight: 800 }}>
                  {formatINR(historyCustomer.balanceDue)}
                </div>
              </div>
              <div className="text-right">
                <span className="bw-label">Total Lifetime Purchases</span>
                <div className="mono" style={{ fontSize: '1.2rem', fontWeight: 700 }}>
                  {formatINR(historyCustomer.totalSpent)}
                </div>
              </div>
            </div>

            {loadingHistory ? (
              <div className="flex flex-col items-center text-center gap-3" style={{ padding: '2rem' }}>
                <DotmSquare4 size={32} dotSize={4} speed={1.35} />
                <span className="mono"><DynamicLoadingText phrases={['Loading transaction audit ledger...', 'Finding past payments...', 'Verifying old bills...', 'Unfolding the ledger...']} /></span>
              </div>
            ) : historyTransactions.length === 0 ? (
              <div className="text-center text-muted" style={{ padding: '2rem' }}>
                No past transactions recorded for this customer yet.
              </div>
            ) : (
              <div style={{ border: '1.5px solid #000', maxHeight: '350px', overflowY: 'auto', overflowX: 'auto' }}>
                <table className="bw-table">
                  <thead>
                    <tr>
                      <th>Date</th>
                      <th>Type</th>
                      <th className="text-right">Amount (₹)</th>
                      <th className="text-right">Balance After (₹)</th>
                      <th>Notes</th>
                    </tr>
                  </thead>
                  <tbody>
                    {historyTransactions.map((tx) => (
                      <tr key={tx.id}>
                        <td className="mono" style={{ fontSize: '0.8rem' }}>
                          {new Date(tx.date).toLocaleDateString('en-IN')}
                        </td>
                        <td>
                          <span
                            className={`bw-badge ${tx.type === 'payment' ? 'bw-badge-black' : ''}`}
                            style={{ fontSize: '0.7rem' }}
                          >
                            {tx.type === 'payment' ? 'PAYMENT' : tx.type === 'credit_sale' ? 'CREDIT SALE' : tx.type}
                          </span>
                        </td>
                        <td className="text-right mono" style={{ fontWeight: 700 }}>
                          {tx.type === 'payment' ? `-${formatINR(tx.amount)}` : `+${formatINR(tx.amount)}`}
                        </td>
                        <td className="text-right mono">
                          {formatINR(tx.balanceAfter)}
                        </td>
                        <td style={{ fontSize: '0.8rem' }}>
                          {tx.notes || '—'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            <div className="flex justify-end" style={{ marginTop: '0.5rem' }}>
              <Button onClick={() => setHistoryCustomer(null)} type="primary">
                Close Ledger
              </Button>
            </div>
          </div>
        </BWModal>
      )}
    </div>
  );
};
