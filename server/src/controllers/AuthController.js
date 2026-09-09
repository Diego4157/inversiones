const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { JWT_SECRET } = require('../middlewares/authMiddleware');

const prisma = new PrismaClient();

const AuthController = {
  // Iniciar sesión
  async login(req, res) {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email y contraseña requeridos' });
    }

    try {
      // 1. Si no existe ningún usuario en el sistema, creamos un admin por defecto
      const totalUsers = await prisma.user.count();
      if (totalUsers === 0) {
        console.log(">> No hay usuarios registrados. Creando administrador inicial...");
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash('admin123', salt);
        await prisma.user.create({
          data: {
            email: 'admin@inversiones.com',
            password: hashedPassword,
            name: 'Administrador Principal',
            role: 'ADMIN',
            username: 'admin'
          }
        });
      }

      // 2. Buscar usuario por email (o username como fallback)
      const user = await prisma.user.findFirst({
        where: {
          OR: [
            { email: email.toLowerCase().trim() },
            { username: email.trim() }
          ]
        }
      });

      if (!user) {
        return res.status(401).json({ error: 'Credenciales inválidas (usuario no encontrado)' });
      }

      // 3. Comparar contraseña con bcrypt
      const passwordToCompare = user.password || user.passwordHash || '';
      const isMatch = await bcrypt.compare(password, passwordToCompare);

      if (!isMatch) {
        return res.status(401).json({ error: 'Credenciales inválidas (contraseña incorrecta)' });
      }

      // 4. Generar Token JWT
      const payload = {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role
      };

      const token = jwt.sign(payload, JWT_SECRET, { expiresIn: '7d' });

      res.json({
        message: 'Autenticación exitosa',
        token,
        user: payload
      });
    } catch (error) {
      console.error('Error en login:', error);
      res.status(500).json({ error: error.message });
    }
  },

  // Obtener información del usuario actual autenticado
  async me(req, res) {
    try {
      const user = await prisma.user.findUnique({
        where: { id: req.user.id },
        select: {
          id: true,
          email: true,
          name: true,
          role: true,
          createdAt: true
        }
      });

      if (!user) {
        return res.status(404).json({ error: 'Usuario no encontrado' });
      }

      res.json({ user });
    } catch (error) {
      console.error('Error en me:', error);
      res.status(500).json({ error: error.message });
    }
  },

  // Registrar un nuevo usuario (solo para ADMIN o inicialización)
  async register(req, res) {
    const { email, password, name, role } = req.body;
    try {
      const existing = await prisma.user.findUnique({
        where: { email: email.toLowerCase().trim() }
      });
      if (existing) {
        return res.status(400).json({ error: 'El correo electrónico ya se encuentra registrado' });
      }

      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash(password, salt);

      const newUser = await prisma.user.create({
        data: {
          email: email.toLowerCase().trim(),
          password: hashedPassword,
          name: name || 'Usuario',
          role: role === 'ADMIN' ? 'ADMIN' : 'COBRADOR'
        },
        select: {
          id: true,
          email: true,
          name: true,
          role: true,
          createdAt: true
        }
      });

      res.status(201).json({ message: 'Usuario registrado exitosamente', user: newUser });
    } catch (error) {
      console.error('Error en registro:', error);
      res.status(500).json({ error: error.message });
    }
  }
};

module.exports = AuthController;
