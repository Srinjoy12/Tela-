import { Router } from 'express';
import authRoutes from './auth.routes';
import productRoutes from './products.routes';
import billRoutes from './bills.routes';
import customerRoutes from './customers.routes';
import goalRoutes from './goals.routes';
import reportRoutes from './reports.routes';
import adminRoutes from './admin.routes';
import supplierRoutes from './suppliers.routes';
import purchaseRoutes from './purchases.routes';
import downloadRoutes from './download.routes';
import historicalRoutes from './historical.routes';
import { requireAuth, requireShop, requireAdmin } from '../middleware/auth.middleware';

const apiRouter = Router();

// Health check endpoint
apiRouter.get('/health', (_req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    service: 'Tela Central API',
  });
});

// Native file download routes (Content-Disposition: attachment directly to OS ~/Downloads)
apiRouter.use('/downloads', downloadRoutes);

// Auth routes (register, login, etc)
apiRouter.use('/auth', authRoutes);

// Protected module routes with multi-tenant isolation
apiRouter.use('/products', requireAuth, requireShop, productRoutes);
apiRouter.use('/suppliers', requireAuth, requireShop, supplierRoutes);
apiRouter.use('/purchases', requireAuth, requireShop, purchaseRoutes);
apiRouter.use('/bills', requireAuth, requireShop, billRoutes);
apiRouter.use('/customers', requireAuth, requireShop, customerRoutes);
apiRouter.use('/goals', requireAuth, requireShop, goalRoutes);
apiRouter.use('/reports', requireAuth, requireShop, reportRoutes);
apiRouter.use('/historical', requireAuth, requireShop, historicalRoutes);
apiRouter.use('/admin', requireAuth, requireAdmin, adminRoutes);

export default apiRouter;
