module.exports = async () => {
  require('dotenv').config({ path: '.env.test' });
  const { sequelize } = require('./src/models');
  await sequelize.sync({ force: true });
  await sequelize.close();
};
