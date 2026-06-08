require('dotenv').config();

const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const initializeDatabase = require('./config/db');
const globalErrorHandler = require('./middleware/errorHandler');

const authenticationRoutes = require('./routes/authRoutes');
const documentQueryRoutes = require('./routes/queryRoutes');
const administrationRoutes = require('./routes/adminRoutes');

const application = express();

application.use(helmet());
application.use(
  cors({
    origin: process.env.CORS_ORIGIN || 'http://localhost:3000',
    credentials: true,
  })
);
application.use(express.json({ limit: '10mb' }));
application.use(morgan('dev'));

const requestThrottle = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  message: { success: false, error: 'Request limit exceeded. Please wait before retrying.' },
  standardHeaders: true,
  legacyHeaders: false,
});
application.use(requestThrottle);

application.use('/api/auth', authenticationRoutes);
application.use('/api/query', documentQueryRoutes);
application.use('/api/admin', administrationRoutes);

application.get('/api/health', (_req, res) => {
  res.status(200).json({
    success: true,
    message: 'Enterprise RAG Assistant API is operational',
    uptime: process.uptime(),
  });
});

application.use((req, res) => {
  res.status(404).json({
    success: false,
    error: `Endpoint not found: ${req.method} ${req.originalUrl}`,
  });
});

application.use(globalErrorHandler);

const SERVICE_PORT = process.env.PORT || 5000;

const bootstrap = async () => {
  try {
    await initializeDatabase();
    application.listen(SERVICE_PORT, () => {
      console.log(`[RAG-Backend] Listening on port ${SERVICE_PORT}`);
    });
  } catch (err) {
    console.error('[RAG-Backend] Startup failure:', err.message);
    process.exit(1);
  }
};

bootstrap();

module.exports = application;
