import React, { useState, useEffect, useRef } from 'react';
import {
  CameraIcon as Camera,
  Cross2Icon as X
} from '@radix-ui/react-icons';
import { BWModal } from '../common/BWModal';
import { Button } from '../ui/button';
import type { Product, Supplier } from '../../types';

interface ProductModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (productData: Partial<Product>) => Promise<void>;
  productToEdit?: Product | null;
  shopId: string;
  suppliers?: Supplier[];
}

export const ProductModal: React.FC<ProductModalProps> = ({
  isOpen,
  onClose,
  onSave,
  productToEdit,
  shopId,
  suppliers = [],
}) => {
  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [category, setCategory] = useState('Silk');
  const [quantity, setQuantity] = useState<number>(1);
  const [costPrice, setCostPrice] = useState<number>(0);
  const [sellingPrice, setSellingPrice] = useState<number>(0);
  const [alertLevel, setAlertLevel] = useState<number>(2);
  const [supplier, setSupplier] = useState('');
  const [supplierId, setSupplierId] = useState('');
  const [isCustomSupplier, setIsCustomSupplier] = useState(false);
  const [colorNotes, setColorNotes] = useState('');
  const [photo, setPhoto] = useState<string>('');
  const [saving, setSaving] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (productToEdit) {
      setName(productToEdit.name);
      setCode(productToEdit.code);
      setCategory(productToEdit.category);
      setQuantity(productToEdit.quantity);
      setCostPrice(productToEdit.costPrice);
      setSellingPrice(productToEdit.sellingPrice);
      setAlertLevel(productToEdit.alertLevel);
      setSupplier(productToEdit.supplier || '');
      setSupplierId(productToEdit.supplierId || '');
      setColorNotes(productToEdit.colorNotes || '');
      setPhoto(productToEdit.photo || '');
      // If supplier exists but not in suppliers list, enable custom
      if (productToEdit.supplier && !suppliers.some((s) => s.id === productToEdit.supplierId)) {
        setIsCustomSupplier(true);
      } else {
        setIsCustomSupplier(false);
      }
    } else {
      setName('');
      setCode(`SKU-${Math.floor(100 + Math.random() * 900)}`);
      setCategory('Silk');
      setQuantity(5);
      setCostPrice(2000);
      setSellingPrice(2800);
      setAlertLevel(2);
      setSupplier('');
      setSupplierId('');
      setIsCustomSupplier(false);
      setColorNotes('');
      setPhoto('');
    }
  }, [productToEdit, isOpen, suppliers]);

  // Real-time calculations
  const expectedProfit = sellingPrice - costPrice;
  const marginPercent = sellingPrice > 0 ? Math.round((expectedProfit / sellingPrice) * 100) : 0;

  // Handle Photo File selection
  const handlePhotoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      alert('Please select an image file (JPEG, PNG, WEBP).');
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      alert('Photo size exceeds 5MB limit. Please choose a smaller photo.');
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      if (event.target?.result) {
        setPhoto(event.target.result as string);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleRemovePhoto = () => {
    setPhoto('');
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleSupplierSelect = (val: string) => {
    if (val === '__custom__') {
      setIsCustomSupplier(true);
      setSupplierId('');
    } else if (val === '') {
      setIsCustomSupplier(false);
      setSupplierId('');
      setSupplier('');
    } else {
      setIsCustomSupplier(false);
      setSupplierId(val);
      const matched = suppliers.find((s) => s.id === val);
      if (matched) setSupplier(matched.name);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      alert('Please enter a product or design name.');
      return;
    }
    setSaving(true);
    try {
      await onSave({
        shopId,
        code: code.trim() || `SKU-${Date.now().toString().slice(-4)}`,
        name: name.trim(),
        category,
        quantity: Number(quantity) || 0,
        costPrice: Number(costPrice) || 0,
        sellingPrice: Number(sellingPrice) || 0,
        alertLevel: Number(alertLevel) || 2,
        supplier: supplier.trim() || undefined,
        supplierId: supplierId || undefined,
        colorNotes: colorNotes.trim() || undefined,
        photo: photo || undefined,
      });
      onClose();
    } catch (err) {
      console.error(err);
      alert('Error saving product.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <BWModal
      isOpen={isOpen}
      onClose={onClose}
      title={productToEdit ? 'Edit Saree / Product' : 'Add New Saree / Design'}
      maxWidth="680px"
    >
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        {/* Name & SKU */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="bw-label">Design / Product Name *</label>
            <input
              type="text"
              className="bw-input"
              placeholder="e.g. Kanjivaram Temple Border Silk"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
          </div>
          <div>
            <label className="bw-label">SKU / Item Code *</label>
            <input
              type="text"
              className="bw-input mono"
              value={code}
              onChange={(e) => setCode(e.target.value)}
              required
            />
          </div>
        </div>

        {/* Category & Quantity */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="bw-label">Fabric / Category</label>
            <select
              className="bw-select"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
            >
              <option value="Silk">Pure Silk / Pattu</option>
              <option value="Banarasi">Banarasi Brocade</option>
              <option value="Cotton">Cotton / Mulmul</option>
              <option value="Chiffon">Chiffon & Georgette</option>
              <option value="Tussar">Tussar & Raw Silk</option>
              <option value="Crepe">Crepe Silk</option>
              <option value="Organza">Organza & Net</option>
              <option value="Linen">Linen & Jute</option>
              <option value="Garment">Readymade Garment / Kurti</option>
              <option value="Other">Other Category</option>
            </select>
          </div>
          <div>
            <label className="bw-label">Initial Stock Quantity (Pieces)</label>
            <input
              type="number"
              min="0"
              className="bw-input mono"
              value={quantity}
              onChange={(e) => setQuantity(Math.max(0, parseInt(e.target.value) || 0))}
            />
          </div>
        </div>

        {/* Cost & Selling Price Box */}
        <div className="bw-box-subtle">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="bw-label">Purchase / Cost Price (₹)</label>
              <input
                type="number"
                min="0"
                className="bw-input mono"
                value={costPrice}
                onChange={(e) => setCostPrice(Math.max(0, parseFloat(e.target.value) || 0))}
              />
              <span className="text-muted" style={{ fontSize: '0.75rem' }}>Weaver purchase or production cost</span>
            </div>
            <div>
              <label className="bw-label">Selling / Retail Price (₹)</label>
              <input
                type="number"
                min="0"
                className="bw-input mono"
                value={sellingPrice}
                onChange={(e) => setSellingPrice(Math.max(0, parseFloat(e.target.value) || 0))}
              />
              <span className="text-muted" style={{ fontSize: '0.75rem' }}>Listed counter price</span>
            </div>
          </div>

          {/* Real-time Profit Preview Box */}
          <div
            className="flex items-center justify-between"
            style={{
              marginTop: '1rem',
              padding: '0.75rem',
              border: '1.5px solid #000',
              background: expectedProfit < 0 ? '#000' : '#FFF',
              color: expectedProfit < 0 ? '#FFF' : '#000',
            }}
          >
            <div>
              <div style={{ fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase' }}>
                Auto Margin Calculation
              </div>
              <div style={{ fontSize: '0.85rem' }}>
                Expected Profit: <strong className="mono">₹{expectedProfit.toLocaleString('en-IN')}</strong> / piece
              </div>
            </div>
            <div className="text-right">
              <span className="bw-badge bw-badge-black mono" style={{ fontSize: '0.9rem', padding: '0.2rem 0.5rem' }}>
                {marginPercent}% Margin
              </span>
              {expectedProfit < 0 && (
                <div style={{ fontSize: '0.75rem', color: '#FFF', fontWeight: 700, marginTop: '2px' }}>
                  WARNING: Below Cost Price
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Low stock alert & Supplier */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="bw-label">Low Stock Alert Level</label>
            <input
              type="number"
              min="1"
              className="bw-input mono"
              value={alertLevel}
              onChange={(e) => setAlertLevel(Math.max(1, parseInt(e.target.value) || 2))}
            />
            <span className="text-muted" style={{ fontSize: '0.75rem' }}>Alert when stock drops to or below this</span>
          </div>
          <div>
            <label className="bw-label">Supplier / Weaver</label>
            {suppliers.length > 0 && !isCustomSupplier ? (
              <div className="flex flex-col gap-1">
                <select
                  className="bw-select"
                  value={supplierId || (supplier ? '__custom__' : '')}
                  onChange={(e) => handleSupplierSelect(e.target.value)}
                >
                  <option value="">No Supplier Selected</option>
                  {suppliers.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name}
                    </option>
                  ))}
                  <option value="__custom__">Enter Custom Supplier...</option>
                </select>
                {supplier && !supplierId && (
                  <span className="text-muted" style={{ fontSize: '0.75rem' }}>Legacy: {supplier}</span>
                )}
              </div>
            ) : (
              <div className="flex gap-1">
                <input
                  type="text"
                  className="bw-input"
                  placeholder="e.g. Ravi Handlooms, Varanasi"
                  value={supplier}
                  onChange={(e) => setSupplier(e.target.value)}
                />
                {suppliers.length > 0 && (
                  <Button
                    htmlType="button"
                    type="secondary"
                    size="small"
                    onClick={() => {
                      setIsCustomSupplier(false);
                      setSupplierId('');
                    }}
                    title="Choose from suppliers list"
                  >
                    List
                  </Button>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Product Photo Upload Section */}
        <div>
          <label className="bw-label">Product / Design Photo (Optional)</label>
          <input
            type="file"
            ref={fileInputRef}
            accept="image/*"
            onChange={handlePhotoSelect}
            style={{ display: 'none' }}
          />

          {photo ? (
            <div
              className="flex items-center gap-3"
              style={{
                border: '1.5px solid #000',
                padding: '0.5rem 0.75rem',
                background: '#FAFAFA',
              }}
            >
              <img
                src={photo}
                alt="Product preview"
                style={{
                  width: '64px',
                  height: '64px',
                  objectFit: 'cover',
                  border: '1px solid #000',
                }}
              />
              <div className="flex-1">
                <div style={{ fontWeight: 600, fontSize: '0.85rem' }}>Photo attached</div>
                <div className="text-muted" style={{ fontSize: '0.75rem' }}>
                  Thumbnail will be displayed in inventory table.
                </div>
              </div>
              <div className="flex gap-2">
                <Button
                  htmlType="button"
                  type="secondary"
                  size="small"
                  onClick={() => fileInputRef.current?.click()}
                >
                  Replace
                </Button>
                <Button
                  htmlType="button"
                  type="secondary"
                  size="small"
                  onClick={handleRemovePhoto}
                  prefix={<X width={14} height={14} />}
                  title="Remove Photo"
                >
                  Remove
                </Button>
              </div>
            </div>
          ) : (
            <div
              onClick={() => fileInputRef.current?.click()}
              className="flex items-center justify-center gap-2"
              style={{
                border: '1.5px dashed #000',
                padding: '1rem',
                cursor: 'pointer',
                background: '#FAFAFA',
                textAlign: 'center',
              }}
            >
              <Camera width={18} height={18} />
              <span style={{ fontSize: '0.85rem', fontWeight: 600 }}>
                Click to upload saree photo or fabric swatch
              </span>
              <span className="text-muted" style={{ fontSize: '0.75rem' }}>
                (PNG, JPG, WebP up to 5MB)
              </span>
            </div>
          )}
        </div>

        {/* Notes / Color */}
        <div>
          <label className="bw-label">Color, Zari & Design Notes</label>
          <input
            type="text"
            className="bw-input"
            placeholder="e.g. Peacock Blue, Silver Zari pallu, pure silk mark"
            value={colorNotes}
            onChange={(e) => setColorNotes(e.target.value)}
          />
        </div>

        <div className="flex justify-between items-center" style={{ marginTop: '1rem', paddingTop: '0.75rem', borderTop: '1.5px solid #000' }}>
          <Button htmlType="button" type="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button htmlType="submit" type="primary" loading={saving}>
            {productToEdit ? 'Update Saree' : 'Save Saree'}
          </Button>
        </div>
      </form>
    </BWModal>
  );
};
