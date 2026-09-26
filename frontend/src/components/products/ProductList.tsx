import { formatINR } from '../../utils/i18n';
import React, { useState } from 'react';
import {
  PlusIcon as Plus,
  FileTextIcon as FileSpreadsheet,
  DownloadIcon as Download,
  MagnifyingGlassIcon as Search,
  ExclamationTriangleIcon as AlertTriangle,
  MixerHorizontalIcon as SlidersHorizontal,
  Pencil2Icon as Edit2,
  CopyIcon as Copy,
  TrashIcon as Trash2,
  ChevronLeftIcon as ChevronLeft,
  ChevronRightIcon as ChevronRight
} from '@radix-ui/react-icons';
import { Button } from '../ui/button';
import type { Product, UserRole } from '../../types';
import { exportProductsToExcel } from '../../utils/excel';
interface ProductListProps {
  products: Product[];
  userRole: UserRole;
  shopName: string;
  shopId?: string;
  onAddProduct: () => void;
  onEditProduct: (product: Product) => void;
  onDuplicateProduct: (product: Product) => void;
  onDeleteProduct: (productId: string) => Promise<void>;
  onAdjustStock: (product: Product) => void;
  onOpenExcelUpload: () => void;
}

export const ProductList: React.FC<ProductListProps> = ({
  products,
  userRole,
  shopName,
  shopId,
  onAddProduct,
  onEditProduct,
  onDuplicateProduct,
  onDeleteProduct,
  onAdjustStock,
  onOpenExcelUpload,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('ALL');
  const [stockStatusFilter, setStockStatusFilter] = useState<'ALL' | 'LOW' | 'OUT'>('ALL');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);

  // Categories present
  const categories = Array.from(new Set(products.map((p) => p.category))).filter(Boolean);

  // Filtered list
  const filteredProducts = products.filter((p) => {
    if (p.archived) return false;

    // Search query
    const matchSearch =
      p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (p.colorNotes && p.colorNotes.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (p.supplier && p.supplier.toLowerCase().includes(searchTerm.toLowerCase()));

    if (!matchSearch) return false;

    // Category filter
    if (categoryFilter !== 'ALL' && p.category !== categoryFilter) return false;

    // Stock level filter
    if (stockStatusFilter === 'LOW' && (p.quantity > p.alertLevel || p.quantity === 0)) return false;
    if (stockStatusFilter === 'OUT' && p.quantity > 0) return false;

    return true;
  });

  const totalPages = Math.max(1, Math.ceil(filteredProducts.length / pageSize));
  const safePage = Math.min(currentPage, totalPages);
  const startIndex = (safePage - 1) * pageSize;
  const paginatedProducts = filteredProducts.slice(startIndex, startIndex + pageSize);

  // Aggregated Stock Stats
  const totalPieces = products.reduce((acc, p) => acc + (p.archived ? 0 : p.quantity), 0);
  const totalCostValue = products.reduce((acc, p) => acc + (p.archived ? 0 : p.quantity * p.costPrice), 0);
  const totalRetailValue = products.reduce((acc, p) => acc + (p.archived ? 0 : p.quantity * p.sellingPrice), 0);
  const totalPotentialProfit = totalRetailValue - totalCostValue;

  const isOwner = userRole === 'owner' || userRole === 'admin';

  return (
    <div className="flex flex-col gap-4">
      {/* Top Header & Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1>Sarees & Garments Inventory</h1>

        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button onClick={onOpenExcelUpload} type="secondary" prefix={<FileSpreadsheet width={16} height={16} />}>
            Upload Excel / CSV
          </Button>
          <Button
            onClick={() => exportProductsToExcel(products, shopName, shopId)}
            type="secondary"
            prefix={<Download width={16} height={16} />}
            title="Export full inventory as Excel sheet (.xlsx)"
          >
            Export Excel (.xlsx)
          </Button>
          <Button onClick={onAddProduct} type="primary" prefix={<Plus width={16} height={16} />}>
            Add Saree
          </Button>
        </div>
      </div>

      {/* Aggregated Stock Summary Cards (PM-3) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="bw-box">
          <span className="bw-label">Total Stock Count</span>
          <div className="mono" style={{ fontSize: '1.5rem', fontWeight: 800 }}>
            {totalPieces} <span style={{ fontSize: '0.9rem', fontWeight: 500 }}>pieces</span>
          </div>

        </div>

        <div className="bw-box">
          <span className="bw-label">Stock Value at Cost</span>
          <div className="mono" style={{ fontSize: '1.5rem', fontWeight: 800 }}>
            {isOwner ? formatINR(totalCostValue) : '••••••••'}
          </div>

        </div>

        <div className="bw-box">
          <span className="bw-label">Stock Value at Selling</span>
          <div className="mono" style={{ fontSize: '1.5rem', fontWeight: 800 }}>
            {formatINR(totalRetailValue)}
          </div>

        </div>

        <div className="bw-box">
          <span className="bw-label">Potential Gross Profit</span>
          <div className="mono" style={{ fontSize: '1.5rem', fontWeight: 800 }}>
            {isOwner ? formatINR(totalPotentialProfit) : '••••••••'}
          </div>

        </div>
      </div>

      {/* Search & Filter Bar */}
      <div className="bw-box-subtle flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div className="flex items-center gap-2 w-full md:w-auto" style={{ flex: 1 }}>
          <Search width={16} height={16} className="text-muted" />
          <input
            type="text"
            className="bw-input"
            placeholder="Search by saree design, SKU code (e.g. KC-001), color notes, or weaver..."
            value={searchTerm}
            onChange={(e) => {
              setSearchTerm(e.target.value);
              setCurrentPage(1);
            }}
          />
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Category Filter */}
          <select
            className="bw-select"
            style={{ width: '160px' }}
            value={categoryFilter}
            onChange={(e) => {
              setCategoryFilter(e.target.value);
              setCurrentPage(1);
            }}
          >
            <option value="ALL">All Categories</option>
            {categories.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>

          {/* Low Stock Quick Toggle */}
          <Button
            onClick={() => {
              setStockStatusFilter(stockStatusFilter === 'LOW' ? 'ALL' : 'LOW');
              setCurrentPage(1);
            }}
            type={stockStatusFilter === 'LOW' ? 'primary' : 'secondary'}
            size="small"
            prefix={<AlertTriangle width={14} height={14} />}
          >
            Low Stock Only
          </Button>
          <Button
            onClick={() => {
              setStockStatusFilter(stockStatusFilter === 'OUT' ? 'ALL' : 'OUT');
              setCurrentPage(1);
            }}
            type={stockStatusFilter === 'OUT' ? 'primary' : 'secondary'}
            size="small"
          >
            Out of Stock
          </Button>
        </div>
      </div>

      {/* Products Table */}
      <div style={{ border: '1.5px solid #000', overflowX: 'auto' }}>
        <table className="bw-table">
          <thead>
            <tr>
              <th>Code</th>
              <th>Design / Saree Name</th>
              <th>Category</th>
              <th className="text-right">In Stock</th>
              <th className="text-right">Cost (₹)</th>
              <th className="text-right">Selling (₹)</th>
              <th className="text-right">Profit / Margin</th>
              <th className="text-center">Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredProducts.length === 0 ? (
              <tr>
                <td colSpan={8} className="text-center" style={{ padding: '3rem' }}>
                  <div style={{ fontWeight: 700, fontSize: '1.1rem' }}>No sarees found</div>
                  <p className="text-muted" style={{ fontSize: '0.85rem', marginTop: '0.25rem' }}>
                    Try clearing your search filters or click "Add Saree" to create your first item.
                  </p>
                </td>
              </tr>
            ) : (
              paginatedProducts.map((product) => {
                const profitPerPiece = product.sellingPrice - product.costPrice;
                const marginPercent =
                  product.sellingPrice > 0
                    ? Math.round((profitPerPiece / product.sellingPrice) * 100)
                    : 0;
                const isLowStock = product.quantity <= product.alertLevel && product.quantity > 0;
                const isOutOfStock = product.quantity === 0;

                return (
                  <tr key={product.id}>
                    <td className="mono" style={{ fontWeight: 700 }}>
                      {product.code}
                    </td>
                    <td>
                      <div className="flex items-center gap-2">
                        {product.photo && (
                          <img
                            src={product.photo}
                            alt={product.name}
                            style={{
                              width: '36px',
                              height: '36px',
                              objectFit: 'cover',
                              border: '1px solid #000',
                              flexShrink: 0,
                            }}
                          />
                        )}
                        <div>
                          <div style={{ fontWeight: 600 }}>{product.name}</div>
                          {product.colorNotes && (
                            <div className="text-muted" style={{ fontSize: '0.75rem' }}>
                              {product.colorNotes}
                            </div>
                          )}
                        </div>
                      </div>
                    </td>
                    <td>
                      <span className="bw-badge">{product.category}</span>
                    </td>
                    <td className="text-right mono">
                      <span style={{ fontWeight: 800, fontSize: '1rem' }}>{product.quantity}</span>
                      {isOutOfStock ? (
                        <div className="bw-badge bw-badge-loss" style={{ display: 'inline-block', marginLeft: '6px' }}>
                          OUT
                        </div>
                      ) : isLowStock ? (
                        <div className="bw-badge" style={{ display: 'inline-block', marginLeft: '6px', background: '#000', color: '#FFF' }}>
                          LOW (≤{product.alertLevel})
                        </div>
                      ) : null}
                    </td>
                    <td className="text-right mono">
                      {isOwner ? formatINR(product.costPrice) : '••••'}
                    </td>
                    <td className="text-right mono" style={{ fontWeight: 700 }}>
                      {formatINR(product.sellingPrice)}
                    </td>
                    <td className="text-right mono">
                      {isOwner ? (
                        <div>
                          <strong>+{formatINR(profitPerPiece)}</strong>
                          <span className="text-muted" style={{ fontSize: '0.75rem', marginLeft: '4px' }}>
                            ({marginPercent}%)
                          </span>
                        </div>
                      ) : (
                        <span className="text-muted">Protected</span>
                      )}
                    </td>
                    <td>
                      <div className="flex items-center justify-center gap-1">
                        <Button
                          onClick={() => onAdjustStock(product)}
                          type="secondary"
                          size="tiny"
                          prefix={<SlidersHorizontal width={13} height={13} />}
                          title="Quick stock adjustment (loss, damage, return)"
                        >
                          Adjust
                        </Button>
                        <Button
                          onClick={() => onEditProduct(product)}
                          type="secondary"
                          size="tiny"
                          svgOnly
                          title="Edit details"
                        >
                          <Edit2 width={13} height={13} />
                        </Button>
                        <Button
                          onClick={() => onDuplicateProduct(product)}
                          type="secondary"
                          size="tiny"
                          svgOnly
                          title="Duplicate design"
                        >
                          <Copy width={13} height={13} />
                        </Button>
                        {isOwner && (
                          <Button
                            onClick={() => {
                              if (confirm(`Archive saree "${product.name}"?`)) {
                                onDeleteProduct(product.id);
                              }
                            }}
                            type="secondary"
                            size="tiny"
                            svgOnly
                            title="Delete"
                          >
                            <Trash2 width={13} height={13} />
                          </Button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination Controls */}
      {filteredProducts.length > 0 && (
        <div
          className="bw-box-subtle flex items-center justify-between"
          style={{ padding: '0.6rem 1rem', border: '1.5px solid #000' }}
        >
          <div className="flex items-center gap-2" style={{ fontSize: '0.85rem' }}>
            <span className="text-muted">
              Showing <strong>{startIndex + 1}</strong> to{' '}
              <strong>{Math.min(startIndex + pageSize, filteredProducts.length)}</strong> of{' '}
              <strong>{filteredProducts.length}</strong> sarees
            </span>
          </div>

          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1" style={{ fontSize: '0.8rem' }}>
              <span className="text-muted">Rows per page:</span>
              <select
                className="bw-select mono"
                style={{ padding: '2px 6px', fontSize: '0.8rem', width: 'auto' }}
                value={pageSize}
                onChange={(e) => {
                  setPageSize(Number(e.target.value));
                  setCurrentPage(1);
                }}
              >
                <option value={15}>15</option>
                <option value={25}>25</option>
                <option value={50}>50</option>
                <option value={100}>100</option>
              </select>
            </div>

            <div className="flex items-center gap-1">
              <Button
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                disabled={safePage <= 1}
                type="secondary"
                size="tiny"
                prefix={<ChevronLeft width={14} height={14} />}
                title="Previous page"
              >
                Prev
              </Button>
              <span className="mono" style={{ fontSize: '0.85rem', padding: '0 6px', fontWeight: 700 }}>
                {safePage} / {totalPages}
              </span>
              <Button
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                disabled={safePage >= totalPages}
                type="secondary"
                size="tiny"
                suffix={<ChevronRight width={14} height={14} />}
                title="Next page"
              >
                Next
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
