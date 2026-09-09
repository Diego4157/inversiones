import { createRequire } from 'module';
const require = createRequire(import.meta.url);

const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');

dotenv.config();

const apiRoutes = require('../server/src/routes/api.js');

const app = express();

// Configuración de CORS permisivo para llamadas web y móviles (PWA)
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

app.use(express.json());

// Endpoint de verificación de salud
app.get(['/api/health', '/health'], (req, res) => {
  res.json({
    status: 'online',
    system: 'Inversiones JD Cloud API',
    database: 'Neon PostgreSQL',
    timestamp: new Date().toISOString()
  });
});

// Soporte tanto para rutas con prefijo /api como directas
app.use('/api', apiRoutes);
app.use('/', apiRoutes);

export default app;
