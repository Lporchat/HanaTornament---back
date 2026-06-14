const jwt = require('jsonwebtoken');
const { User, Organization } = require('../models');

const generateToken = (id) =>
  jwt.sign({ id }, process.env.JWT_SECRET, { expiresIn: process.env.JWT_EXPIRES_IN });

const sanitizeCpf = (cpf) => cpf.replace(/\D/g, '');

const isValidCpf = (cpf) => {
  const digits = sanitizeCpf(cpf);
  if (digits.length !== 11 || /^(\d)\1{10}$/.test(digits)) return false;

  let sum = 0;
  for (let i = 0; i < 9; i++) sum += parseInt(digits[i]) * (10 - i);
  let remainder = (sum * 10) % 11;
  if (remainder === 10 || remainder === 11) remainder = 0;
  if (remainder !== parseInt(digits[9])) return false;

  sum = 0;
  for (let i = 0; i < 10; i++) sum += parseInt(digits[i]) * (11 - i);
  remainder = (sum * 10) % 11;
  if (remainder === 10 || remainder === 11) remainder = 0;
  return remainder === parseInt(digits[10]);
};

const register = async (req, res) => {
  try {
    const { fullName, cpf, birthDate, email, password, role, storeName } = req.body;

    if (!fullName || !cpf || !birthDate || !email || !password) {
      return res.status(400).json({ message: 'Todos os campos são obrigatórios.' });
    }

    if (role && role !== 'player' && role !== 'store') {
      return res.status(400).json({ message: 'Tipo de conta inválido.' });
    }

    if (role === 'store' && !storeName) {
      return res.status(400).json({ message: 'Nome da loja é obrigatório.' });
    }

    if (!isValidCpf(cpf)) {
      return res.status(400).json({ message: 'CPF inválido.' });
    }

    const cpfFormatted = sanitizeCpf(cpf);

    const [emailExists, cpfExists] = await Promise.all([
      User.findOne({ where: { email } }),
      User.findOne({ where: { cpf: cpfFormatted } }),
    ]);

    if (emailExists) return res.status(409).json({ message: 'E-mail já cadastrado.' });
    if (cpfExists) return res.status(409).json({ message: 'CPF já cadastrado.' });

    const user = await User.create({
      fullName, cpf: cpfFormatted, birthDate, email, password,
      role: role || 'player',
    });

    if (user.role === 'store') {
      await Organization.create({ name: storeName, ownerId: user.id });
    }

    const token = generateToken(user.id);

    return res.status(201).json({
      user: { id: user.id, fullName: user.fullName, email: user.email, role: user.role },
      token,
    });
  } catch (err) {
    return res.status(500).json({ message: 'Erro interno.', error: err.message });
  }
};

const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ message: 'Email e senha são obrigatórios.' });
    }

    const user = await User.findOne({ where: { email } });
    if (!user || !(await user.checkPassword(password))) {
      return res.status(401).json({ message: 'Credenciais inválidas.' });
    }

    const token = generateToken(user.id);

    return res.json({
      user: { id: user.id, fullName: user.fullName, email: user.email, role: user.role },
      token,
    });
  } catch (err) {
    return res.status(500).json({ message: 'Erro interno.', error: err.message });
  }
};

const me = async (req, res) => {
  try {
    const user = await User.findByPk(req.userId, {
      attributes: ['id', 'fullName', 'cpf', 'birthDate', 'email', 'role', 'createdAt'],
    });

    if (!user) return res.status(404).json({ message: 'Usuário não encontrado.' });

    return res.json({ user });
  } catch (err) {
    return res.status(500).json({ message: 'Erro interno.', error: err.message });
  }
};

module.exports = { register, login, me };
