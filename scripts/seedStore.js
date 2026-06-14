require('dotenv').config();
const { sequelize, User, Organization } = require('../src/models');

const STORE_EMAIL = 'loja@hanatornament.com';
const STORE_PASSWORD = 'loja12345';
const STORE_CPF = '52998224725'; // CPF válido de teste

(async () => {
  try {
    await sequelize.authenticate();
    await sequelize.sync({ alter: true });

    let user = await User.findOne({ where: { email: STORE_EMAIL } });

    if (!user) {
      user = await User.create({
        fullName: 'Loja Demo',
        cpf: STORE_CPF,
        birthDate: '1990-01-01',
        email: STORE_EMAIL,
        password: STORE_PASSWORD,
        role: 'store',
      });
      console.log('Usuário loja criado.');
    } else if (user.role !== 'store') {
      await user.update({ role: 'store' });
      console.log('Usuário existente promovido a loja.');
    } else {
      console.log('Usuário loja já existe.');
    }

    let org = await Organization.findOne({ where: { ownerId: user.id } });
    if (!org) {
      org = await Organization.create({ name: 'Loja Demo', ownerId: user.id });
      console.log('Organização criada.');
    }

    console.log('---');
    console.log('Login de teste (loja):');
    console.log(`  email: ${STORE_EMAIL}`);
    console.log(`  senha: ${STORE_PASSWORD}`);
    console.log('---');
  } catch (err) {
    console.error('Erro ao gerar usuário de loja:', err);
  } finally {
    await sequelize.close();
  }
})();
