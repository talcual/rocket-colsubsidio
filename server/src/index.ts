import express from 'express';
import cors from 'cors';
import path from 'path';
import employeesRouter from './routes/employees';
import productsRouter from './routes/products';
import sessionsRouter from './routes/sessions';
import auditRouter from './routes/audit';

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

// API routes
app.use('/api/employees', employeesRouter);
app.use('/api/products', productsRouter);
app.use('/api/sessions', sessionsRouter);
app.use('/api/audit', auditRouter);

// Health check
app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Serve static frontend in production
if (process.env.NODE_ENV === 'production') {
  const staticPath = path.join(__dirname, '../../client/dist');
  app.use(express.static(staticPath));
  app.get('*', (_req, res) => {
    res.sendFile(path.join(staticPath, 'index.html'));
  });
}

app.listen(PORT, () => {
  console.log(`🚀 Rocket Colsubsidio server running on port ${PORT}`);
  console.log(`   API available at http://localhost:${PORT}/api`);
});

export default app;
