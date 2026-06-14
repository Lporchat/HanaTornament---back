require('dotenv').config();
const app = require('./src/app');
const { sequelize } = require('./src/models');

const PORT = process.env.PORT || 3000;

(async () => {
  try {
    await sequelize.authenticate();
    console.log('Banco de dados conectado.');

    await sequelize.sync({ alter: true });
    console.log('Modelos sincronizados.');

    app.listen(PORT, () => console.log(`Servidor rodando na porta ${PORT}`));
  } catch (err) {
    console.error('Erro ao iniciar:', err);
    process.exit(1);
  }
})();
