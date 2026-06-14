const { CreditWallet, CreditTransaction, User } = require('../models');
const sequelize = require('../config/database');

const getOrCreateWallet = async (userId, transaction = null) => {
  const [wallet] = await CreditWallet.findOrCreate({
    where: { userId },
    defaults: { userId, balance: 0 },
    transaction,
  });
  return wallet;
};

// Jogador consulta o próprio saldo
const getMyWallet = async (req, res) => {
  try {
    const wallet = await getOrCreateWallet(req.userId);
    return res.json({ balance: parseFloat(wallet.balance) });
  } catch (err) {
    return res.status(500).json({ message: 'Erro interno.', error: err.message });
  }
};

// Jogador consulta o próprio extrato
const getMyTransactions = async (req, res) => {
  try {
    const wallet = await getOrCreateWallet(req.userId);

    const { page = 1, limit = 20 } = req.query;
    const offset = (parseInt(page) - 1) * parseInt(limit);

    const { count, rows: transactions } = await CreditTransaction.findAndCountAll({
      where: { walletId: wallet.id },
      order: [['createdAt', 'DESC']],
      limit: parseInt(limit),
      offset,
    });

    return res.json({
      balance: parseFloat(wallet.balance),
      total: count,
      page: parseInt(page),
      transactions,
    });
  } catch (err) {
    return res.status(500).json({ message: 'Erro interno.', error: err.message });
  }
};

// Organizador registra um gasto de crédito na loja
const spend = async (req, res) => {
  try {
    const { userId, amount, description } = req.body;

    if (!userId || !amount || amount <= 0) {
      return res.status(400).json({ message: 'userId e amount (positivo) são obrigatórios.' });
    }

    const user = await User.findByPk(userId);
    if (!user) return res.status(404).json({ message: 'Usuário não encontrado.' });

    const t = await sequelize.transaction();
    try {
      const wallet = await getOrCreateWallet(userId, t);

      if (parseFloat(wallet.balance) < parseFloat(amount)) {
        await t.rollback();
        return res.status(400).json({
          message: `Saldo insuficiente. Saldo atual: R$ ${parseFloat(wallet.balance).toFixed(2)}`,
        });
      }

      await CreditWallet.decrement('balance', {
        by: parseFloat(amount),
        where: { id: wallet.id },
        transaction: t,
      });

      const txRecord = await CreditTransaction.create({
        walletId: wallet.id,
        type: 'spent',
        amount: parseFloat(amount),
        description: description || 'Resgate na loja',
      }, { transaction: t });

      await t.commit();

      const updated = await CreditWallet.findByPk(wallet.id);
      return res.json({
        transaction: txRecord.toJSON(),
        newBalance: parseFloat(updated.balance),
      });
    } catch (err) {
      await t.rollback();
      throw err;
    }
  } catch (err) {
    return res.status(500).json({ message: 'Erro interno.', error: err.message });
  }
};

// Organizador faz ajuste manual (positivo ou negativo)
const adjust = async (req, res) => {
  try {
    const { userId, amount, description } = req.body;

    if (!userId || amount === undefined || amount === 0) {
      return res.status(400).json({ message: 'userId, amount (diferente de 0) e description são obrigatórios.' });
    }

    const user = await User.findByPk(userId);
    if (!user) return res.status(404).json({ message: 'Usuário não encontrado.' });

    const t = await sequelize.transaction();
    try {
      const wallet = await getOrCreateWallet(userId, t);

      const newBalance = parseFloat(wallet.balance) + parseFloat(amount);
      if (newBalance < 0) {
        await t.rollback();
        return res.status(400).json({ message: 'Ajuste resultaria em saldo negativo.' });
      }

      await CreditWallet.update(
        { balance: newBalance },
        { where: { id: wallet.id }, transaction: t }
      );

      const txRecord = await CreditTransaction.create({
        walletId: wallet.id,
        type: 'adjusted',
        amount: parseFloat(amount),
        description: description || 'Ajuste manual',
      }, { transaction: t });

      await t.commit();

      return res.json({ transaction: txRecord.toJSON(), newBalance });
    } catch (err) {
      await t.rollback();
      throw err;
    }
  } catch (err) {
    return res.status(500).json({ message: 'Erro interno.', error: err.message });
  }
};

// Organizador consulta saldo de qualquer jogador
const getPlayerWallet = async (req, res) => {
  try {
    const user = await User.findByPk(req.params.userId, {
      attributes: ['id', 'fullName', 'email'],
    });
    if (!user) return res.status(404).json({ message: 'Usuário não encontrado.' });

    const wallet = await getOrCreateWallet(req.params.userId);

    const transactions = await CreditTransaction.findAll({
      where: { walletId: wallet.id },
      order: [['createdAt', 'DESC']],
      limit: 20,
    });

    return res.json({
      user,
      balance: parseFloat(wallet.balance),
      transactions,
    });
  } catch (err) {
    return res.status(500).json({ message: 'Erro interno.', error: err.message });
  }
};

module.exports = { getMyWallet, getMyTransactions, spend, adjust, getPlayerWallet };
