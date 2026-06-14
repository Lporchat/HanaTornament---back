require('dotenv').config({ path: '.env.test' });
const request = require('supertest');
const app = require('../app');
const { sequelize } = require('../models');

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

const clearDatabase = async () => {
  await sequelize.query(
    `TRUNCATE TABLE credit_transactions, credit_wallets, player_rivalries,
     matches, rounds, prize_distributions, tournament_enrollments,
     tournaments, organizations, users CASCADE`
  );
};

const createUser = async (overrides = {}) => {
  const role = overrides.role || 'store';
  const res = await request(app).post('/api/auth/register').send({
    fullName: overrides.fullName || `User ${Date.now()}${Math.random()}`,
    email: overrides.email || `user_${Date.now()}_${Math.random()}@test.com`,
    password: overrides.password || 'password123',
    cpf: overrides.cpf || generateCpf(),
    birthDate: overrides.birthDate || '1990-01-01',
    role,
    ...(role === 'store' ? { storeName: overrides.storeName || 'Test Store' } : {}),
  });
  if (res.status !== 201) throw new Error(`createUser failed: ${JSON.stringify(res.body)}`);
  return { user: res.body.user, token: res.body.token };
};

const createOrg = async (token, overrides = {}) => {
  const res = await request(app)
    .post('/api/organizations')
    .set('Authorization', `Bearer ${token}`)
    .send({ name: overrides.name || 'Test Org' });
  if (res.status !== 201) throw new Error(`createOrg failed: ${JSON.stringify(res.body)}`);
  return res.body.organization;
};

const createTournament = async (token, orgId, overrides = {}) => {
  const { organizationId, name, game, entryFee, startDate, ...rest } = overrides;
  const res = await request(app)
    .post('/api/tournaments')
    .set('Authorization', `Bearer ${token}`)
    .send({
      organizationId: orgId,
      name: name || 'Test Tournament',
      game: game || 'pokemon',
      entryFee: entryFee ?? 10,
      ...(startDate ? { startDate } : {}),
    });
  if (res.status !== 201) throw new Error(`createTournament failed: ${JSON.stringify(res.body)}`);
  return res.body.tournament;
};

const openTournament = async (token, tournamentId) => {
  const res = await request(app)
    .patch(`/api/tournaments/${tournamentId}/open`)
    .set('Authorization', `Bearer ${token}`);
  if (res.status !== 200) throw new Error(`openTournament failed: ${JSON.stringify(res.body)}`);
};

const setupTournament = async (playerCount = 4) => {
  const { user: organizer, token: orgToken } = await createUser({ fullName: 'Organizer' });
  const org = await createOrg(orgToken);
  const tournament = await createTournament(orgToken, org.id, { entryFee: 10 });
  await openTournament(orgToken, tournament.id);

  const players = [];
  for (let i = 0; i < playerCount; i++) {
    const { user, token } = await createUser({ fullName: `Player ${i + 1}` });
    await request(app)
      .post(`/api/tournaments/${tournament.id}/enrollments`)
      .set('Authorization', `Bearer ${token}`);
    await request(app)
      .patch(`/api/tournaments/${tournament.id}/enrollments/${user.id}/validate`)
      .set('Authorization', `Bearer ${orgToken}`);
    players.push({ user, token });
  }

  const startRes = await request(app)
    .patch(`/api/tournaments/${tournament.id}/start`)
    .set('Authorization', `Bearer ${orgToken}`);
  if (startRes.status !== 200) throw new Error(`startTournament failed: ${JSON.stringify(startRes.body)}`);

  return {
    organizer, orgToken, org, tournament: startRes.body.tournament, players,
    round: startRes.body.round, matches: startRes.body.matches,
  };
};

// Joga a rodada em andamento (criada automaticamente no start ou pela rodada anterior).
// Cria uma nova rodada apenas se a última já estiver finalizada.
const runRound = async (orgToken, tournament) => {
  const roundsRes = await request(app).get(`/api/tournaments/${tournament.id}/rounds`);
  const rounds = roundsRes.body.rounds || [];
  const lastRound = rounds[rounds.length - 1];

  let round, matches;
  if (lastRound && lastRound.status !== 'finished') {
    round = lastRound;
    matches = lastRound.matches;
  } else {
    const roundRes = await request(app)
      .post(`/api/tournaments/${tournament.id}/rounds`)
      .set('Authorization', `Bearer ${orgToken}`);
    if (roundRes.status !== 201) throw new Error(`createRound failed: ${JSON.stringify(roundRes.body)}`);
    round = roundRes.body.round;
    matches = roundRes.body.matches;
  }

  for (const match of matches) {
    if (match.isBye) continue;
    await request(app)
      .patch(`/api/tournaments/${tournament.id}/rounds/${round.id}/matches/${match.id}/result`)
      .set('Authorization', `Bearer ${orgToken}`)
      .send({ winnerId: match.player1Id });
  }

  await request(app)
    .patch(`/api/tournaments/${tournament.id}/rounds/${round.id}/finish`)
    .set('Authorization', `Bearer ${orgToken}`);

  return round;
};

module.exports = { clearDatabase, createUser, createOrg, createTournament, openTournament, setupTournament, runRound, generateCpf };
