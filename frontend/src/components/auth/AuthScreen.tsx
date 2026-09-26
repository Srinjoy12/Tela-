import React, { useState } from 'react';
import {
  ArrowRightIcon as ArrowRight,
  EyeOpenIcon as Eye,
  EyeClosedIcon as EyeOff
} from '@radix-ui/react-icons';
import type { BusinessType, Shop } from '../../types';
import { signInWithSupabase, resetPasswordForEmail } from '../../utils/supabase';
import { Button } from '../ui/button';

interface AuthScreenProps {
  onLoginSuccess: (shop: Shop) => void;
  onCreateShop?: (shopData: Omit<Shop, 'id' | 'createdAt'>) => Promise<Shop>;
}

export const AuthScreen: React.FC<AuthScreenProps> = ({
  onLoginSuccess,
}) => {
  const [mode, setMode] = useState<'SIGN_IN' | 'CREATE_ACCOUNT' | 'FORGOT_PASSWORD'>('SIGN_IN');
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  // Sign In fields
  const [loginId, setLoginId] = useState('');
  const [loginPassword, setLoginPassword] = useState('');

  // Create Account fields
  const [regEmail, setRegEmail] = useState('');
  const [regPhone, setRegPhone] = useState('');
  const [regPassword, setRegPassword] = useState('');
  const [shopName, setShopName] = useState('');
  const [ownerName, setOwnerName] = useState('');
  const [businessType, setBusinessType] = useState<BusinessType>('Saree');
  const [address, setAddress] = useState('');

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!loginId.trim() || !loginPassword.trim()) {
      setErrorMsg('Please enter your email/phone and password.');
      return;
    }
    setSubmitting(true);
    setErrorMsg('');
    try {
      const { user } = await signInWithSupabase(loginId.trim(), loginPassword);
      if (!user) {
        throw new Error('Login failed. Please check your credentials.');
      }
      // Fetch shop profile linked to this user from backend
      const userEmail = encodeURIComponent(user.email || '');
      const res = await fetch(`/api/auth/shops?userId=${user.id}&email=${userEmail}`);
      const json = await res.json();
      if (json.success && json.data && json.data.length > 0) {
        onLoginSuccess(json.data[0]);
      } else {
        throw new Error('No shop profile found for this account. Please create a new store account.');
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Login failed.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleCreateAccount = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!shopName.trim() || !ownerName.trim() || !regPassword.trim()) {
      setErrorMsg('Please fill in Shop Name, Owner Name, and Password.');
      return;
    }
    if (!regEmail.trim() && !regPhone.trim()) {
      setErrorMsg('Please enter either an email address or mobile number.');
      return;
    }
    if (regPassword.length < 6) {
      setErrorMsg('Password must be at least 6 characters.');
      return;
    }

    setSubmitting(true);
    setErrorMsg('');
    try {
      const emailOrPhone = regEmail.trim() || regPhone.trim();
      const phone = regPhone.trim() || '';

      // 1. Register user with Supabase Auth via backend (auto-confirm)
      const registerRes = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: emailOrPhone,
          password: regPassword,
          shopName: shopName.trim(),
          ownerName: ownerName.trim(),
          phone,
          businessType,
          address: address.trim() || undefined,
        }),
      });
      const registerJson = await registerRes.json();
      if (!registerJson.success) {
        throw new Error(registerJson.error || 'Registration failed.');
      }

      // 2. Sign in with the newly created account
      const { user } = await signInWithSupabase(emailOrPhone, regPassword);
      if (!user) {
        throw new Error('Account created but login failed. Please try Sign In.');
      }

      onLoginSuccess(registerJson.data.shop);
    } catch (err: any) {
      setErrorMsg(err.message || 'Registration failed.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!loginId.trim()) {
      setErrorMsg('Please enter your email or mobile number.');
      return;
    }
    setSubmitting(true);
    setErrorMsg('');
    setSuccessMsg('');
    try {
      await resetPasswordForEmail(loginId.trim());
      setSuccessMsg('Password reset instructions have been sent. Please check your email or messages.');
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to send reset link.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      style={{
        minHeight: '100vh',
        background: '#FFF',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '1.5rem',
      }}
    >
      <div style={{ maxWidth: '480px', width: '100%' }}>
        {/* Brand Header */}
        <div className="text-center" style={{ marginBottom: '2rem' }}>
          <h1 style={{ fontSize: '1.75rem', letterSpacing: '-0.03em', textTransform: 'uppercase' }}>
            {mode === 'SIGN_IN' ? 'Sign In to Your Store' : mode === 'CREATE_ACCOUNT' ? 'Create Store Account' : 'Reset Password'}
          </h1>
        </div>

        {/* Mode Tabs */}
        <div className="flex" style={{ borderBottom: '2px solid #000', marginBottom: '1.25rem' }}>
          <button
            type="button"
            onClick={() => { setMode('SIGN_IN'); setErrorMsg(''); setSuccessMsg(''); }}
            style={{
              flex: 1,
              padding: '0.6rem',
              border: 'none',
              borderBottom: mode === 'SIGN_IN' ? '3px solid #000' : '3px solid transparent',
              background: 'none',
              fontWeight: mode === 'SIGN_IN' ? 800 : 400,
              fontSize: '0.95rem',
              cursor: 'pointer',
              textTransform: 'uppercase',
              letterSpacing: '0.03em',
            }}
          >
            Sign In
          </button>
          <button
            type="button"
            onClick={() => { setMode('CREATE_ACCOUNT'); setErrorMsg(''); setSuccessMsg(''); }}
            style={{
              flex: 1,
              padding: '0.6rem',
              border: 'none',
              borderBottom: mode === 'CREATE_ACCOUNT' ? '3px solid #000' : '3px solid transparent',
              background: 'none',
              fontWeight: mode === 'CREATE_ACCOUNT' ? 800 : 400,
              fontSize: '0.95rem',
              cursor: 'pointer',
              textTransform: 'uppercase',
              letterSpacing: '0.03em',
            }}
          >
            Create Account
          </button>
        </div>

        {/* Messages */}
        {errorMsg && (
          <div style={{
            background: '#000',
            color: '#FFF',
            padding: '0.5rem 0.75rem',
            marginBottom: '1rem',
            fontSize: '0.85rem',
            fontWeight: 600,
          }}>
            ⚠ {errorMsg}
          </div>
        )}
        
        {successMsg && (
          <div style={{
            background: '#E8F5E9',
            color: '#2E7D32',
            border: '1px solid #2E7D32',
            padding: '0.5rem 0.75rem',
            marginBottom: '1rem',
            fontSize: '0.85rem',
            fontWeight: 600,
          }}>
            ✓ {successMsg}
          </div>
        )}

        {/* SIGN IN FORM */}
        {mode === 'SIGN_IN' && (
          <form onSubmit={handleSignIn} className="bw-box flex flex-col gap-4">
            <div>
              <label className="bw-label">Email or Mobile Number *</label>
              <input
                type="text"
                required
                className="bw-input mono"
                style={{ fontSize: '1.05rem', letterSpacing: '0.02em' }}
                placeholder="e.g. owner@shop.com or 9876543210"
                value={loginId}
                onChange={(e) => setLoginId(e.target.value)}
                autoFocus
              />
            </div>

            <div>
              <label className="bw-label">Password *</label>
              <div style={{ position: 'relative' }}>
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  className="bw-input mono"
                  style={{ fontSize: '1.05rem', paddingRight: '2.5rem' }}
                  placeholder="Enter your password"
                  value={loginPassword}
                  onChange={(e) => setLoginPassword(e.target.value)}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  style={{
                    position: 'absolute', right: '0.5rem', top: '50%', transform: 'translateY(-50%)',
                    background: 'none', border: 'none', cursor: 'pointer', padding: '0.25rem',
                  }}
                >
                  {showPassword ? <EyeOff width={16} height={16} /> : <Eye width={16} height={16} />}
                </button>
              </div>
            </div>

            <div className="flex justify-between items-center">
              <Button htmlType="submit" disabled={submitting} type="primary" size="large" fullWidth style={{ flex: 1, marginRight: '1rem' }} loading={submitting} suffix={!submitting && <ArrowRight width={16} height={16} />}>
                {submitting ? 'Signing In...' : 'Sign In'}
              </Button>
            </div>

            <div className="text-center text-muted flex flex-col gap-2" style={{ fontSize: '0.8rem' }}>
              <div>
                Don't have an account?{' '}
                <button
                  type="button"
                  onClick={() => { setMode('CREATE_ACCOUNT'); setErrorMsg(''); setSuccessMsg(''); }}
                  style={{ background: 'none', border: 'none', textDecoration: 'underline', cursor: 'pointer', fontWeight: 700, padding: 0 }}
                >
                  Create Store Account
                </button>
              </div>
              <div>
                <button
                  type="button"
                  onClick={() => { setMode('FORGOT_PASSWORD'); setErrorMsg(''); setSuccessMsg(''); }}
                  style={{ background: 'none', border: 'none', cursor: 'pointer', fontWeight: 600, padding: 0 }}
                >
                  Forgot Password?
                </button>
              </div>
            </div>
          </form>
        )}

        {/* FORGOT PASSWORD FORM */}
        {mode === 'FORGOT_PASSWORD' && (
          <form onSubmit={handleForgotPassword} className="bw-box flex flex-col gap-4">
            <div>
              <label className="bw-label">Email or Mobile Number *</label>
              <input
                type="text"
                required
                className="bw-input mono"
                style={{ fontSize: '1.05rem', letterSpacing: '0.02em' }}
                placeholder="e.g. owner@shop.com or 9876543210"
                value={loginId}
                onChange={(e) => setLoginId(e.target.value)}
                autoFocus
              />
            </div>
            
            <Button htmlType="submit" disabled={submitting} type="primary" size="large" fullWidth loading={submitting} suffix={!submitting && <ArrowRight width={16} height={16} />}>
              {submitting ? 'Sending...' : 'Send Reset Link'}
            </Button>

            <div className="text-center text-muted" style={{ fontSize: '0.8rem' }}>
              Remember your password?{' '}
              <button
                type="button"
                onClick={() => { setMode('SIGN_IN'); setErrorMsg(''); setSuccessMsg(''); }}
                style={{ background: 'none', border: 'none', textDecoration: 'underline', cursor: 'pointer', fontWeight: 700, padding: 0 }}
              >
                Sign In
              </button>
            </div>
          </form>
        )}

        {/* CREATE ACCOUNT FORM */}
        {mode === 'CREATE_ACCOUNT' && (
          <form onSubmit={handleCreateAccount} className="bw-box flex flex-col gap-4">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="bw-label">Shop / Business Name *</label>
                <input
                  type="text"
                  required
                  className="bw-input"
                  placeholder="e.g. Meenakshi Handlooms"
                  value={shopName}
                  onChange={(e) => setShopName(e.target.value)}
                  autoFocus
                />
              </div>
              <div>
                <label className="bw-label">Owner Name *</label>
                <input
                  type="text"
                  required
                  className="bw-input"
                  placeholder="e.g. Ramesh Kumar"
                  value={ownerName}
                  onChange={(e) => setOwnerName(e.target.value)}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="bw-label">Email Address *</label>
                <input
                  type="email"
                  className="bw-input mono"
                  placeholder="owner@shop.com"
                  value={regEmail}
                  onChange={(e) => setRegEmail(e.target.value)}
                />
              </div>
              <div>
                <label className="bw-label">Mobile Number</label>
                <input
                  type="tel"
                  className="bw-input mono"
                  placeholder="9876543210"
                  maxLength={10}
                  value={regPhone}
                  onChange={(e) => setRegPhone(e.target.value.replace(/\D/g, ''))}
                />
              </div>
            </div>

            <div>
              <label className="bw-label">Create Password * (min 6 characters)</label>
              <div style={{ position: 'relative' }}>
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  minLength={6}
                  className="bw-input mono"
                  style={{ paddingRight: '2.5rem' }}
                  placeholder="Create a strong password"
                  value={regPassword}
                  onChange={(e) => setRegPassword(e.target.value)}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  style={{
                    position: 'absolute', right: '0.5rem', top: '50%', transform: 'translateY(-50%)',
                    background: 'none', border: 'none', cursor: 'pointer', padding: '0.25rem',
                  }}
                >
                  {showPassword ? <EyeOff width={16} height={16} /> : <Eye width={16} height={16} />}
                </button>
              </div>
            </div>

            <div>
              <label className="bw-label">Business Type *</label>
              <select
                className="bw-select"
                value={businessType}
                onChange={(e) => setBusinessType(e.target.value as BusinessType)}
              >
                <option value="Saree">Saree Shop (Handloom, Silk, Cotton)</option>
                <option value="Garments">Garments & Ready-to-Wear</option>
                <option value="General">General Retail Store</option>
                <option value="Electronics">Electronics & Appliances</option>
                <option value="Hardware">Hardware & Tools</option>
                <option value="Grocery">Grocery & Supermarket</option>
                <option value="Jewellery">Jewellery & Accessories</option>
                <option value="Footwear">Shoes & Footwear</option>
                <option value="Furniture">Furniture & Home Decor</option>
                <option value="Pharmacy">Pharmacy & Healthcare</option>
                <option value="Restaurant">Restaurant & Dining</option>
                <option value="Cafe">Cafe & Bakery</option>
                <option value="Stationery">Stationery & Books</option>
                <option value="Automotive">Automotive & Spares</option>
                <option value="Cosmetics">Cosmetics & Beauty</option>
                <option value="Other">Other Business Type</option>
              </select>
            </div>

            <div>
              <label className="bw-label">Shop Address / Market (Optional)</label>
              <input
                type="text"
                className="bw-input"
                placeholder="e.g. Shop #12, Dharmavaram Weaver Market"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
              />
            </div>

            <Button htmlType="submit" disabled={submitting} type="primary" size="large" fullWidth loading={submitting} suffix={!submitting && <ArrowRight width={16} height={16} />}>
              {submitting ? 'Creating Account...' : 'Create Store Account & Open Counter'}
            </Button>

            <div className="text-center text-muted" style={{ fontSize: '0.8rem' }}>
              Already have an account?{' '}
              <button
                type="button"
                onClick={() => { setMode('SIGN_IN'); setErrorMsg(''); setSuccessMsg(''); }}
                style={{ background: 'none', border: 'none', textDecoration: 'underline', cursor: 'pointer', fontWeight: 700, padding: 0 }}
              >
                Sign In
              </button>
            </div>
          </form>
        )}


      </div>
    </div>
  );
};
