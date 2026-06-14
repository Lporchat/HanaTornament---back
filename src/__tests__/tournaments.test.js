const request = require('supertest');
const app = require('../app');
const { clearDatabase, createUser, createOrg, createTournament, openTournament, setupTournament } = require('./helpers');

beforeEach(clearDatabase);

describe('POST /api/tournaments', () => {
  it('deve criar um torneio', async () => {
    const { token } = await createUser();
    const org = await createOrg(token);
    const res = await request(app).post('/api/tournaments').set('Authorization', `Bearer ${token}`)
      .send({ organizationId: org.id, name: 'Torneio 1', game: 'pokemon', entryFee: 20 });
    expect(res.status).toBe(201);
    expect(res.body.tournament.status).toBe('draft');
  });

  it('deve retornar 400 se campos obrigatórios faltam', async () => {
    const { token } = await createUser();
    const res = await request(app).post('/api/tournaments').set('Authorization', `Bearer ${token}`).send({ name: 'X' });
    expect(res.status).toBe(400);
  });

  it('deve retornar 403 para organização de outro usuário', async () => {
    const { token: t1 } = await createUser();
    const { token: t2 } = await createUser();
    const org = await createOrg(t1);
    const res = await request(app).post('/api/tournaments').set('Authorization', `Bearer ${t2}`)
      .send({ organizationId: org.id, name: 'X', game: 'magic' });
    expect(res.status).toBe(403);
  });

  it('deve retornar 403 se o usuário não é uma loja', async () => {
    const { token } = await createUser({ role: 'player' });
    const res = await request(app).post('/api/tournaments').set('Authorization', `Bearer ${token}`)
      .send({ name: 'Torneio Jogador', game: 'pokemon' });
    expect(res.status).toBe(403);
  });

  it('deve criar organização própria automaticamente para loja sem organizationId', async () => {
    const { token } = await createUser({ role: 'store' });
    const res = await request(app).post('/api/tournaments').set('Authorization', `Bearer ${token}`)
      .send({ name: 'Torneio Loja', game: 'pokemon' });
    expect(res.status).toBe(201);
    expect(res.body.tournament.organizationId).toBeDefined();
  });
});

describe('GET /api/tournaments', () => {
  it('deve listar torneios', async () => {
    const { token } = await createUser();
    const org = await createOrg(token);
    await createTournament(token, org.id, { game: 'pokemon' });
    await createTournament(token, org.id, { game: 'magic' });
    const res = await request(app).get('/api/tournaments');
    expect(res.status).toBe(200);
    expect(res.body.tournaments.length).toBeGreaterThanOrEqual(2);
  });

  it('deve filtrar por jogo', async () => {
    const { token } = await createUser();
    const org = await createOrg(token);
    await createTournament(token, org.id, { game: 'pokemon' });
    await createTournament(token, org.id, { game: 'magic' });
    const res = await request(app).get('/api/tournaments?game=pokemon');
    expect(res.status).toBe(200);
    res.body.tournaments.forEach((t) => expect(t.game).toBe('pokemon'));
  });
});

describe('GET /api/tournaments/:id', () => {
  it('deve retornar detalhes do torneio', async () => {
    const { token } = await createUser();
    const org = await createOrg(token);
    const tournament = await createTournament(token, org.id);
    const res = await request(app).get(`/api/tournaments/${tournament.id}`);
    expect(res.status).toBe(200);
    expect(res.body.tournament.enrollments).toBeDefined();
    expect(res.body.tournament.prizeDistribution).toBeDefined();
  });

  it('deve retornar 404 para id inexistente', async () => {
    const res = await request(app).get('/api/tournaments/00000000-0000-0000-0000-000000000000');
    expect(res.status).toBe(404);
  });
});

describe('PUT /api/tournaments/:id', () => {
  it('deve atualizar torneio em draft', async () => {
    const { token } = await createUser();
    const org = await createOrg(token);
    const tournament = await createTournament(token, org.id);
    const res = await request(app).put(`/api/tournaments/${tournament.id}`)
      .set('Authorization', `Bearer ${token}`).send({ name: 'Novo Nome', game: 'magic' });
    expect(res.status).toBe(200);
    expect(res.body.tournament.name).toBe('Novo Nome');
  });

  it('deve retornar 400 para torneio não-draft', async () => {
    const { token } = await createUser();
    const org = await createOrg(token);
    const tournament = await createTournament(token, org.id);
    await openTournament(token, tournament.id);
    const res = await request(app).put(`/api/tournaments/${tournament.id}`)
      .set('Authorization', `Bearer ${token}`).send({ name: 'X' });
    expect(res.status).toBe(400);
  });
});

describe('PATCH /api/tournaments/:id/open', () => {
  it('deve abrir inscrições', async () => {
    const { token } = await createUser();
    const org = await createOrg(token);
    const tournament = await createTournament(token, org.id);
    const res = await request(app).patch(`/api/tournaments/${tournament.id}/open`).set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body.tournament.status).toBe('open');
  });

  it('deve retornar 400 se não está em draft', async () => {
    const { token } = await createUser();
    const org = await createOrg(token);
    const tournament = await createTournament(token, org.id);
    await openTournament(token, tournament.id);
    const res = await request(app).patch(`/api/tournaments/${tournament.id}/open`).set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(400);
  });
});

describe('PATCH /api/tournaments/:id/start', () => {
  it('deve iniciar torneio com 4 jogadores e calcular rodadas', async () => {
    const { tournament } = await setupTournament(4);
    expect(tournament.status).toBe('in_progress');
    expect(tournament.swissRounds).toBe(3);
    expect(tournament.topCut).toBe(0);
  });

  it('deve retornar 400 com menos de 4 jogadores confirmados', async () => {
    const { token } = await createUser();
    const org = await createOrg(token);
    const tournament = await createTournament(token, org.id);
    await openTournament(token, tournament.id);
    const res = await request(app).patch(`/api/tournaments/${tournament.id}/start`).set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(400);
    expect(res.body.message).toMatch(/Mínimo/);
  });
});

describe('PUT /api/tournaments/:id/prizes', () => {
  it('deve atualizar percentuais de premiação', async () => {
    const { token } = await createUser();
    const org = await createOrg(token);
    const tournament = await createTournament(token, org.id);
    const prizes = [{ position: 1, percentage: 60 }, { position: 2, percentage: 40 }];
    const res = await request(app).put(`/api/tournaments/${tournament.id}/prizes`)
      .set('Authorization', `Bearer ${token}`).send({ prizes });
    expect(res.status).toBe(200);
    expect(res.body.prizeDistribution).toHaveLength(2);
  });

  it('deve retornar 400 se percentuais não somam 100', async () => {
    const { token } = await createUser();
    const org = await createOrg(token);
    const tournament = await createTournament(token, org.id);
    const prizes = [{ position: 1, percentage: 60 }, { position: 2, percentage: 20 }];
    const res = await request(app).put(`/api/tournaments/${tournament.id}/prizes`)
      .set('Authorization', `Bearer ${token}`).send({ prizes });
    expect(res.status).toBe(400);
    expect(res.body.message).toMatch(/100%/);
  });
});
