import React, { useState } from 'react';
import {
  PersonIcon as UserPlus,
  TrashIcon as Trash2,
  SwitchIcon as ToggleLeft,
  SwitchIcon as ToggleRight,
  ArrowLeftIcon as ArrowLeft,
  ExclamationTriangleIcon as AlertOctagon
} from '@radix-ui/react-icons';
import { Button } from '../ui/button';
import type { AdminConfig, Shop, Product, Bill } from '../../types';

interface AdminDashboardProps {
  adminConfig: AdminConfig;
  allShops: Shop[];
  allProducts: Product[];
  allBills: Bill[];
  onUpdateAdminConfig: (updated: Partial<AdminConfig>) => Promise<void>;
  onAddWhitelistedUser: (identifier: string, name: string, notes: string) => Promise<void>;
  onRemoveWhitelistedUser: (id: string) => Promise<void>;
  onClearAllDatabase: () => Promise<void>;
  onExitToShop: () => void;
}

export const AdminDashboard: React.FC<AdminDashboardProps> = ({
  adminConfig,
  allShops,
  allProducts,
  allBills,
  onUpdateAdminConfig,
  onAddWhitelistedUser,
  onRemoveWhitelistedUser,
  onClearAllDatabase,
  onExitToShop,
}) => {
  const [newIdentifier, setNewIdentifier] = useState('');
  const [newName, setNewName] = useState('');
  const [newNotes, setNewNotes] = useState('');
  const [actionLimit, setActionLimit] = useState(adminConfig.trialActionLimit || 25);
  const [isUpdating, setIsUpdating] = useState(false);

  // Fleet Totals
  const totalShops = allShops.length;
  const totalProducts = allProducts.length;
  const totalBills = allBills.length;
  const totalGrossVolume = allBills.reduce((acc, b) => acc + b.total, 0);

  // Toggle Global Subscription Switch
  const handleToggleGlobalSubscription = async () => {
    setIsUpdating(true);
    try {
      await onUpdateAdminConfig({
        globalSubscriptionEnabled: !adminConfig.globalSubscriptionEnabled,
      });
    } catch (err) {
      console.error(err);
      alert('Error updating subscription switch.');
    } finally {
      setIsUpdating(false);
    }
  };

  // Update Action Limit
  const handleSaveActionLimit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsUpdating(true);
    try {
      await onUpdateAdminConfig({
        trialActionLimit: Number(actionLimit),
      });
      alert('Free action threshold updated successfully!');
    } catch (err) {
      console.error(err);
      alert('Error updating limit.');
    } finally {
      setIsUpdating(false);
    }
  };

  // Add Whitelisted User
  const handleAddWhitelist = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newIdentifier.trim()) {
      alert('Please enter a phone number or email.');
      return;
    }
    try {
      await onAddWhitelistedUser(newIdentifier.trim(), newName.trim(), newNotes.trim());
      setNewIdentifier('');
      setNewName('');
      setNewNotes('');
    } catch (err) {
      console.error(err);
      alert('Error adding user to whitelist.');
    }
  };

  return (
    <div className="flex flex-col gap-6" style={{ maxWidth: '1440px', margin: '0 auto', padding: '1.5rem 0' }}>
      <div className="flex items-center justify-between" style={{ borderBottom: '2px solid #000', paddingBottom: '1rem' }}>
        <div>
          <div className="flex items-center gap-2">
            <h1>Admin Panel</h1>
            <span className="bw-badge bw-badge-black">Master Access</span>
            <span className="bw-badge mono" style={{ fontSize: '0.75rem' }}>URL: #admin</span>
          </div>

        </div>

        <div className="flex items-center gap-3">
          <Button
            htmlType="button"
            onClick={async () => {
              if (confirm('CAUTION: Are you sure you want to completely clear the entire database (all shops, products, bills, customers)?')) {
                await onClearAllDatabase();
                alert('Database cleared successfully!');
              }
            }}
            type="error"
            size="small"
            title="Reset database to empty state"
            prefix={<AlertOctagon width={14} height={14} />}
          >
            Clear All Database
          </Button>

          <Button
            htmlType="button"
            onClick={onExitToShop}
            size="small"
            type="primary"
            title="Switch back to standard vendor counter app"
            prefix={<ArrowLeft width={14} height={14} />}
          >
            Back to Shop Counter
          </Button>
        </div>
      </div>

      {/* MASTER SUBSCRIPTION TOGGLE BOX */}
      <div
        className="bw-box flex items-center justify-between"
        style={{
          border: '2px solid #000',
          background: adminConfig.globalSubscriptionEnabled ? '#FFF' : '#000',
          color: adminConfig.globalSubscriptionEnabled ? '#000' : '#FFF',
          padding: '1.5rem',
        }}
      >
        <div>
          <div style={{ fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 800 }}>
            Master Platform Subscription Switch
          </div>
          <h2 style={{ color: 'inherit', margin: '0.3rem 0' }}>
            {adminConfig.globalSubscriptionEnabled
              ? 'SUBSCRIPTION PAYWALL IS ACTIVE (₹499)'
              : '100% FREE ACCESS MODE (PAYWALL DISABLED GLOBALLY)'}
          </h2>
          <p style={{ fontSize: '0.85rem', color: adminConfig.globalSubscriptionEnabled ? '#555' : '#CCC', maxWidth: '650px' }}>
            {adminConfig.globalSubscriptionEnabled
              ? 'Users are prompted for a ₹499 lifetime license once they exceed the free action limit. Whitelisted phone numbers/emails continue to access for free.'
              : 'All users and shops can use all features for free without ever seeing a subscription or payment prompt. Ideal for early user acquisition and initial beta.'}
          </p>
        </div>

        <div>
          <Button
            onClick={handleToggleGlobalSubscription}
            disabled={isUpdating}
            size="large"
            type={adminConfig.globalSubscriptionEnabled ? 'primary' : 'secondary'}
            loading={isUpdating}
            prefix={adminConfig.globalSubscriptionEnabled ? <ToggleRight width={24} height={24} /> : <ToggleLeft width={24} height={24} />}
          >
            {adminConfig.globalSubscriptionEnabled 
              ? 'Turn OFF Subscription (Make 100% Free)' 
              : 'Turn ON Subscription Paywall'}
          </Button>
        </div>
      </div>

      {/* FLEET MONITORING KPIS */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="bw-box">
          <span className="bw-label">Registered Shops</span>
          <div className="mono" style={{ fontSize: '1.75rem', fontWeight: 800 }}>
            {totalShops}
          </div>
          <span className="text-muted" style={{ fontSize: '0.75rem' }}>Active vendors</span>
        </div>
        <div className="bw-box">
          <span className="bw-label">Cataloged Products</span>
          <div className="mono" style={{ fontSize: '1.75rem', fontWeight: 800 }}>
            {totalProducts} <span style={{ fontSize: '0.9rem' }}>sarees</span>
          </div>
          <span className="text-muted" style={{ fontSize: '0.75rem' }}>Across all stores</span>
        </div>
        <div className="bw-box">
          <span className="bw-label">Bills Processed</span>
          <div className="mono" style={{ fontSize: '1.75rem', fontWeight: 800 }}>
            {totalBills}
          </div>
          <span className="text-muted" style={{ fontSize: '0.75rem' }}>Completed sales</span>
        </div>
        <div className="bw-box">
          <span className="bw-label">Gross Processed Volume</span>
          <div className="mono" style={{ fontSize: '1.75rem', fontWeight: 800 }}>
            ₹{totalGrossVolume.toLocaleString('en-IN')}
          </div>
          <span className="text-muted" style={{ fontSize: '0.75rem' }}>Platform retail flow</span>
        </div>
      </div>

      {/* WHITELIST & FAMILY BYPASS MANAGEMENT */}
      <div className="bw-box flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <div>
            <h3>Family & VIP Whitelist (Free Direct Access)</h3>
            <p className="text-muted" style={{ fontSize: '0.85rem' }}>
              Add mobile numbers or email addresses here. Anyone on this list will <strong>never</strong> be asked to pay or subscribe.
            </p>
          </div>
          <span className="bw-badge bw-badge-black mono">
            {adminConfig.whitelistedUsers.length} Whitelisted Accounts
          </span>
        </div>

        {/* Add User Form */}
        <form onSubmit={handleAddWhitelist} className="bw-box-subtle grid grid-cols-1 sm:grid-cols-4 gap-3 items-end">
          <div>
            <label className="bw-label">Mobile Number or Email *</label>
            <input
              type="text"
              required
              className="bw-input"
              placeholder="e.g. 9876543210 or sister@gmail.com"
              value={newIdentifier}
              onChange={(e) => setNewIdentifier(e.target.value)}
            />
          </div>
          <div>
            <label className="bw-label">Contact / Name</label>
            <input
              type="text"
              className="bw-input"
              placeholder="e.g. Ramesh (Cousin)"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
            />
          </div>
          <div>
            <label className="bw-label">Admin Notes</label>
            <input
              type="text"
              className="bw-input"
              placeholder="e.g. Family member - permanent free access"
              value={newNotes}
              onChange={(e) => setNewNotes(e.target.value)}
            />
          </div>
          <div>
            <Button htmlType="submit" type="primary" fullWidth prefix={<UserPlus width={16} height={16} />}>
              Grant Free Access
            </Button>
          </div>
        </form>

        {/* Whitelist Table */}
        <div style={{ border: '1.5px solid #000', overflowX: 'auto' }}>
          <table className="bw-table">
            <thead>
              <tr>
                <th>Identifier (Mobile / Email)</th>
                <th>Name</th>
                <th>Admin Notes</th>
                <th>Added Date</th>
                <th>Access Status</th>
                <th className="text-center">Action</th>
              </tr>
            </thead>
            <tbody>
              {adminConfig.whitelistedUsers.length === 0 ? (
                <tr>
                  <td colSpan={6} className="text-center" style={{ padding: '1.5rem' }}>
                    No whitelisted users yet. Add your family or friends above.
                  </td>
                </tr>
              ) : (
                adminConfig.whitelistedUsers.map((user) => (
                  <tr key={user.id}>
                    <td className="mono" style={{ fontWeight: 700 }}>
                      {user.identifier}
                    </td>
                    <td>{user.name || '—'}</td>
                    <td style={{ fontSize: '0.85rem' }}>{user.notes || '—'}</td>
                    <td style={{ fontSize: '0.8rem' }}>
                      {new Date(user.addedAt).toLocaleDateString('en-IN')}
                    </td>
                    <td>
                      <span className="bw-badge bw-badge-black">VIP LIFETIME FREE</span>
                    </td>
                    <td className="text-center">
                      <Button
                        onClick={() => onRemoveWhitelistedUser(user.id)}
                        type="secondary"
                        size="small"
                        title="Remove from whitelist"
                        prefix={<Trash2 width={13} height={13} />}
                      />
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* TRIAL ACTIONS THRESHOLD CONFIG */}
      <div className="bw-box">
        <h3>Trial Usage Threshold Before Paywall</h3>
        <p className="text-muted" style={{ fontSize: '0.85rem', marginTop: '0.2rem' }}>
          When subscription is ON, allow new users to perform this many actions (adding sarees, creating bills) before prompting the payment screen:
        </p>

        <form onSubmit={handleSaveActionLimit} className="flex items-center gap-3" style={{ marginTop: '1rem' }}>
          <div style={{ width: '200px' }}>
            <label className="bw-label">Free Actions / Tasks Allowed</label>
            <input
              type="number"
              min="5"
              max="200"
              className="bw-input mono"
              value={actionLimit}
              onChange={(e) => setActionLimit(parseInt(e.target.value) || 25)}
            />
          </div>
          <Button htmlType="submit" disabled={isUpdating} type="primary" loading={isUpdating} style={{ alignSelf: 'flex-end' }}>
            Save Threshold Limit
          </Button>
        </form>
      </div>

      {/* REGISTERED SHOPS DIRECTORY */}
      <div className="bw-box flex flex-col gap-3">
        <h3>Active Shops Fleet Directory</h3>
        <div style={{ border: '1.5px solid #000', overflowX: 'auto' }}>
          <table className="bw-table">
            <thead>
              <tr>
                <th>Shop Name</th>
                <th>Owner</th>
                <th>Phone / Identifier</th>
                <th>Business Type</th>
                <th>Created</th>
                <th>Access Tier</th>
              </tr>
            </thead>
            <tbody>
              {allShops.map((s) => {
                const isShopWhitelisted = adminConfig.whitelistedUsers.some(
                  (w) => w.identifier === s.phone || (s.email && w.identifier === s.email)
                );

                return (
                  <tr key={s.id}>
                    <td style={{ fontWeight: 700 }}>{s.name}</td>
                    <td>{s.ownerName}</td>
                    <td className="mono">{s.phone}</td>
                    <td><span className="bw-badge">{s.businessType}</span></td>
                    <td style={{ fontSize: '0.8rem' }}>{new Date(s.createdAt).toLocaleDateString('en-IN')}</td>
                    <td>
                      {isShopWhitelisted ? (
                        <span className="bw-badge bw-badge-black">WHITELISTED (FREE)</span>
                      ) : !adminConfig.globalSubscriptionEnabled ? (
                        <span className="bw-badge">GLOBAL FREE</span>
                      ) : (
                        <span className="bw-badge">STANDARD TRIAL</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
