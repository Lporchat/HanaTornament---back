const { Organization, Tournament, User } = require('../models');

const create = async (req, res) => {
  try {
    const { name } = req.body;

    if (!name) return res.status(400).json({ message: 'Nome é obrigatório.' });

    const requester = await User.findByPk(req.userId);
    if (!requester || requester.role !== 'store') {
      return res.status(403).json({ message: 'Apenas contas de loja podem criar organizações.' });
    }

    const organization = await Organization.create({ name, ownerId: req.userId });

    return res.status(201).json({ organization });
  } catch (err) {
    return res.status(500).json({ message: 'Erro interno.', error: err.message });
  }
};

const list = async (req, res) => {
  try {
    const organizations = await Organization.findAll({
      where: { ownerId: req.userId },
    });

    return res.json({ organizations });
  } catch (err) {
    return res.status(500).json({ message: 'Erro interno.', error: err.message });
  }
};

const getById = async (req, res) => {
  try {
    const organization = await Organization.findOne({
      where: { id: req.params.id, ownerId: req.userId },
      include: [{ model: Tournament, as: 'tournaments' }],
    });

    if (!organization) return res.status(404).json({ message: 'Organização não encontrada.' });

    return res.json({ organization });
  } catch (err) {
    return res.status(500).json({ message: 'Erro interno.', error: err.message });
  }
};

const update = async (req, res) => {
  try {
    const { name } = req.body;

    const organization = await Organization.findOne({
      where: { id: req.params.id, ownerId: req.userId },
    });

    if (!organization) return res.status(404).json({ message: 'Organização não encontrada.' });

    await organization.update({ name });

    return res.json({ organization });
  } catch (err) {
    return res.status(500).json({ message: 'Erro interno.', error: err.message });
  }
};

const remove = async (req, res) => {
  try {
    const organization = await Organization.findOne({
      where: { id: req.params.id, ownerId: req.userId },
    });

    if (!organization) return res.status(404).json({ message: 'Organização não encontrada.' });

    await organization.destroy();

    return res.status(204).send();
  } catch (err) {
    return res.status(500).json({ message: 'Erro interno.', error: err.message });
  }
};

module.exports = { create, list, getById, update, remove };
