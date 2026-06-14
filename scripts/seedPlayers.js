require('dotenv').config();
const { sequelize, User } = require('../src/models');

const PLAYER_PASSWORD = 'jogador123';

const generateCpf = () => {
  let digits;
  do {
    digits = Array.from({ length: 9 }, () => Math.floor(Math.random() * 10));
  } while (/^(\d)\1{8}$/.test(digits.join('')));

  let sum = digits.reduce((acc, d, i) => acc + d * (10 - i), 0);
  let rem = (sum * 10) % 11;
  if (rem >= 10) rem = 0;
  digits.push(rem);

  sum = digits.reduce((acc, d, i) => acc + d * (11 - i), 0);
  rem = (sum * 10) % 11;
  if (rem >= 10) rem = 0;
  digits.push(rem);

  return digits.join('');
};

const PLAYERS = [1, 2, 3, 4].map((n) => ({
  fullName: `Jogador ${n}`,
  email: `player${n}@hanatornament.com`,
  cpf: generateCpf(),
  birthDate: '1995-01-01',
}));

(async () => {
  try {
    await sequelize.authenticate();
    await sequelize.sync({ alter: true });

    for (const p of PLAYERS) {
      let user = await User.findOne({ where: { email: p.email } });
      if (!user) {
        user = await User.create({
          fullName: p.fullName,
          cpf: p.cpf,
          birthDate: p.birthDate,
          email: p.email,
          password: PLAYER_PASSWORD,
          role: 'player',
        });
        console.log(`Usuário ${p.email} criado.`);
      } else {
        console.log(`Usuário ${p.email} já existe.`);
      }
    }

    console.log('---');
    console.log('Login de teste (players):');
    PLAYERS.forEach((p) => console.log(`  email: ${p.email}  senha: ${PLAYER_PASSWORD}`));
    console.log('---');
  } catch (err) {
    console.error('Erro ao gerar usuários de jogador:', err);
  } finally {
    await sequelize.close();
  }
})();
