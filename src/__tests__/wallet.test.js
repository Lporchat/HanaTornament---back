const request = require('supertest');
const app = require('../app');
const { clearDatabase, createUser, setupTournament, runRound } = require('./helpers');

beforeEach(clearDatabase);

describe('GET /api/wallet/me', () => {
  it('deve retornar saldo zero para usuário sem transações', async () => {
    const { token } = await createUser();
    const res = await request(app).get('/api/wallet/me').set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body.balance).toBe(0);
  });
});

describe('GET /api/wallet/me/transactions', () => {
  it('deve retornar extrato vazio', async () => {
    const { token } = await createUser();
    const res = await request(app).get('/api/wallet/me/transactions').set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body.transactions).toHaveLength(0);
    expect(res.body.total).toBe(0);
  });

  it('deve retornar créditos ganhos após torneio', async () => {
    const { orgToken, tournament, players } = await setupTournament(4);
    for (let i = 0; i < tournament.swissRounds; i++) {
      await runRound(orgToken, tournament);
    }
    const { token } = players[0];
    const res = await request(app).get('/api/wallet/me/transactions').set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
  }, 60000);
});

describe('POST /api/wallet/spend', () => {
  it('deve registrar gasto e reduzir saldo', async () => {
    const { user, token: orgToken } = await createUser();
    // Adiciona saldo via adjust antes de gastar
    await request(app).post('/api/wallet/adjust').set('Authorization', `Bearer ${orgToken}`)
      .send({ userId: user.id, amount: 50, description: 'Crédito inicial' });

    const res = await request(app).post('/api/wallet/spend').set('Authorization', `Bearer ${orgToken}`)
      .send({ userId: user.id, amount: 30, description: 'Produto X' });

    expect(res.status).toBe(200);
    expect(res.body.newBalance).toBe(20);
    expect(res.body.transaction.type).toBe('spent');
  });

  it('deve retornar 400 para saldo insuficiente', async () => {
    const { user } = await createUser();
    const { token: orgToken } = await createUser();
    const res = await request(app).post('/api/wallet/spend').set('Authorization', `Bearer ${orgToken}`)
      .send({ userId: user.id, amount: 100, description: 'X' });
    expect(res.status).toBe(400);
    expect(res.body.message).toMatch(/Saldo insuficiente/);
  });
});

describe('POST /api/wallet/adjust', () => {
  it('deve adicionar crédito com ajuste positivo', async () => {
    const { user, token } = await createUser();
    const res = await request(app).post('/api/wallet/adjust').set('Authorization', `Bearer ${token}`)
      .send({ userId: user.id, amount: 100, description: 'Bônus' });
    expect(res.status).toBe(200);
    expect(res.body.newBalance).toBe(100);
    expect(res.body.transaction.type).toBe('adjusted');
  });

  it('deve subtrair crédito com ajuste negativo', async () => {
    const { user, token } = await createUser();
    await request(app).post('/api/wallet/adjust').set('Authorization', `Bearer ${token}`)
      .send({ userId: user.id, amount: 100, description: 'Crédito' });
    const res = await request(app).post('/api/wallet/adjust').set('Authorization', `Bearer ${token}`)
      .send({ userId: user.id, amount: -40, description: 'Correção' });
    expect(res.status).toBe(200);
    expect(res.body.newBalance).toBe(60);
  });

  it('deve retornar 400 se ajuste resultaria em saldo negativo', async () => {
    const { user, token } = await createUser();
    const res = await request(app).post('/api/wallet/adjust').set('Authorization', `Bearer ${token}`)
      .send({ userId: user.id, amount: -50, description: 'X' });
    expect(res.status).toBe(400);
    expect(res.body.message).toMatch(/negativo/);
  });
});

describe('GET /api/wallet/player/:userId', () => {
  it('deve retornar saldo e extrato de qualquer jogador', async () => {
    const { user, token: orgToken } = await createUser();
    await request(app).post('/api/wallet/adjust').set('Authorization', `Bearer ${orgToken}`)
      .send({ userId: user.id, amount: 75, description: 'Prêmio' });

    const res = await request(app).get(`/api/wallet/player/${user.id}`).set('Authorization', `Bearer ${orgToken}`);
    expect(res.status).toBe(200);
    expect(res.body.balance).toBe(75);
    expect(res.body.user.id).toBe(user.id);
    expect(res.body.transactions).toHaveLength(1);
  });
});
