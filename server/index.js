const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const apiRoutes = require('./src/routes/api');

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

// Middlewares
app.use(cors()); // Habilita conexiones desde el frontend
app.use(express.json());

// Rutas
app.use('/api', apiRoutes);

// Test de conexión
app.get('/', (req, res) => {
  res.send('Servidor de Inversiones JD está ACTIVO');
});

app.listen(PORT, () => {
  console.log(`>> Servidor corriendo en http://localhost:${PORT}`);
});
