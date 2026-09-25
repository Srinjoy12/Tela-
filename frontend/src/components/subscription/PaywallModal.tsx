import React, { useState } from 'react';
import {
  LockClosedIcon as Lock,
  StarIcon as Gift
} from '@radix-ui/react-icons';
import { BWModal } from '../common/BWModal';

interface PaywallModalProps {
  isOpen: boolean;
  onClose: () => void;
  actionCount: number;
  onActivateLifetime: () => void;
  onApplyFamilyCode: (code: string) => boolean;
}

export const PaywallModal: React.FC<PaywallModalProps> = ({
  isOpen,
  onClose,
  actionCount,
  onActivateLifetime,
  onApplyFamilyCode,
}) => {
  const [familyCode, setFamilyCode] = useState('');
  const [codeMessage, setCodeMessage] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);

  const handleApplyCode = (e: React.FormEvent) => {
    e.preventDefault();
    if (!familyCode.trim()) return;

    const success = onApplyFamilyCode(familyCode.trim());
    if (success) {
      setCodeMessage('Family / VIP Access Granted! Full lifetime unlocked.');
      setTimeout(() => {
        onClose();
      }, 1200);
    } else {
      setCodeMessage('Invalid Family Access Code. Contact admin for whitelisting.');
    }
  };

  const handleSimulatePayment = () => {
    setIsProcessing(true);
    setTimeout(() => {
      onActivateLifetime();
      setIsProcessing(false);
      onClose();
    }, 1000);
  };

  return (
    <BWModal
      isOpen={isOpen}
      onClose={() => {
        // Can only close if activated, or cancel to review
        onClose();
      }}
      title="Tela Lifetime License"
      maxWidth="550px"
    >
      <div className="flex flex-col gap-4 text-center">
        <div className="bw-box flex flex-col items-center justify-center" style={{ background: '#000', color: '#FFF', padding: '2rem 1rem' }}>
          <Lock width={36} height={36} style={{ marginBottom: '0.75rem' }} />
          <h2 style={{ color: '#FFF', letterSpacing: '-0.02em' }}>
            Trial Free Actions Limit Reached ({actionCount} Actions Completed)
          </h2>
          <p style={{ fontSize: '0.85rem', color: '#CCC', maxWidth: '400px', marginTop: '0.4rem' }}>
            You've experienced Tela inventory and counter billing. Upgrade to keep using all features with no limits.
          </p>
        </div>

        {/* Pricing Card */}
        <div className="bw-box-subtle flex flex-col gap-2 text-left">
          <div className="flex justify-between items-baseline">
            <span style={{ fontWeight: 800, fontSize: '1.1rem' }}>One-Time Lifetime License</span>
            <div className="mono" style={{ fontSize: '1.75rem', fontWeight: 800 }}>
              ₹499 <span style={{ fontSize: '0.85rem', fontWeight: 400 }}>only</span>
            </div>
          </div>
          <div className="text-muted" style={{ fontSize: '0.8rem' }}>
            NO monthly recurring fees. Pay once, use forever. Works 100% offline on your device.
          </div>

          <ul style={{ paddingLeft: '1.2rem', marginTop: '0.5rem', fontSize: '0.85rem', lineHeight: 1.6 }}>
            <li>Unlimited sarees and inventory items</li>
            <li>Real-time counter bargaining profit/loss calculator</li>
            <li>Excel & CSV bulk import/export</li>
            <li>Printable & WhatsApp shareable customer receipts</li>
            <li>Monthly profit pace & goal tracking</li>
          </ul>

          <button
            onClick={handleSimulatePayment}
            disabled={isProcessing}
            className="bw-btn bw-btn-lg"
            style={{ width: '100%', marginTop: '0.75rem' }}
          >
            {isProcessing ? 'Activating License...' : 'Pay ₹499 via UPI / Card (Lifetime Access)'}
          </button>
        </div>

        {/* Family / Admin Whitelist Bypass Code */}
        <div className="bw-box text-left">
          <div className="flex items-center gap-2">
            <Gift width={16} height={16} />
            <span style={{ fontWeight: 700, fontSize: '0.9rem' }}>Family / VIP Bypass Access</span>
          </div>
          <p className="text-muted" style={{ fontSize: '0.8rem', marginTop: '0.2rem' }}>
            If you are a family member or the admin has given you a VIP code, enter it below to bypass payment completely:
          </p>

          <form onSubmit={handleApplyCode} className="flex gap-2" style={{ marginTop: '0.5rem' }}>
            <input
              type="text"
              className="bw-input mono"
              placeholder="Enter VIP / Family Access Code"
              value={familyCode}
              onChange={(e) => setFamilyCode(e.target.value)}
            />
            <button type="submit" className="bw-btn bw-btn-outline" style={{ whiteSpace: 'nowrap' }}>
              Unlock Free
            </button>
          </form>

          {codeMessage && (
            <div style={{ fontSize: '0.8rem', fontWeight: 700, marginTop: '0.4rem' }}>
              {codeMessage}
            </div>
          )}
        </div>
      </div>
    </BWModal>
  );
};
