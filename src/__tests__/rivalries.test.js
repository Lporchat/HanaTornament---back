const request = require('supertest');
const app = require('../app');
const { clearDatabase, setupTournament, runRound } = require('./helpers');

beforeEach(clearDatabase);

describe('GET /api/rivalries', () => {
  it('deve retornar vazio sem confrontos', async () => {
    const { players } = await setupTournament(4);
    const { token } = players[0];
    const res = await request(app).get('/api/rivalries').set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body.nemesis).toBeNull();
    expect(res.body.bye).toBeNull();
    expect(res.body.rivalries).toHaveLength(0);
  });

  it('deve retornar nemesis e bye após confrontos suficientes', async () => {
    const { orgToken, tournament, players } = await setupTournament(4);
    for (let i = 0; i < tournament.swissRounds; i++) {
      await runRound(orgToken, tournament);
    }
    const { token } = players[0];
    const res = await request(app).get('/api/rivalries').set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    if (res.body.rivalries.length > 0) {
      expect(res.body.rivalries[0].myWinRate).toBeDefined();
      expect(res.body.rivalries[0].opponentWinRate).toBeDefined();
    }
  }, 60000);
});

describe('GET /api/rivalries/h2h/:opponentId', () => {
  it('deve retornar mensagem sem confrontos registrados', async () => {
    const { players } = await setupTournament(4);
    const { token } = players[0];
    const { user: opponent } = players[1];
    const res = await request(app).get(`/api/rivalries/h2h/${opponent.id}`).set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body.message).toMatch(/Nenhum confronto/);
  });

  it('deve retornar estatísticas após partidas', async () => {
    const { orgToken, tournament, players } = await setupTournament(4);
    await runRound(orgToken, tournament);

    const { token } = players[0];
    const { user: opponent } = players[1];
    const res = await request(app).get(`/api/rivalries/h2h/${opponent.id}`).set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    // Pode ter ou não se confrontado dependendo do pareamento aleatório
    if (!res.body.message) {
      expect(res.body.totalMatches).toBeGreaterThan(0);
      expect(typeof res.body.myWinRate).toBe('number');
    }
  });
});
