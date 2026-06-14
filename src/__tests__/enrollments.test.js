const request = require('supertest');
const app = require('../app');
const { clearDatabase, createUser, createOrg, createTournament, openTournament } = require('./helpers');

beforeEach(clearDatabase);

const setupOpen = async () => {
  const { user: organizer, token: orgToken } = await createUser();
  const org = await createOrg(orgToken);
  const tournament = await createTournament(orgToken, org.id);
  await openTournament(orgToken, tournament.id);
  return { organizer, orgToken, tournament };
};

describe('POST /api/tournaments/:id/enrollments', () => {
  it('deve inscrever um jogador', async () => {
    const { tournament } = await setupOpen();
    const { token } = await createUser();
    const res = await request(app).post(`/api/tournaments/${tournament.id}/enrollments`).set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(201);
    expect(res.body.enrollment.paymentValidated).toBe(false);
  });

  it('deve retornar 400 se torneio não está aberto', async () => {
    const { token: orgToken } = await createUser();
    const org = await createOrg(orgToken);
    const tournament = await createTournament(orgToken, org.id);
    const { token } = await createUser();
    const res = await request(app).post(`/api/tournaments/${tournament.id}/enrollments`).set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(400);
  });

  it('deve retornar 409 se já está inscrito', async () => {
    const { tournament } = await setupOpen();
    const { token } = await createUser();
    await request(app).post(`/api/tournaments/${tournament.id}/enrollments`).set('Authorization', `Bearer ${token}`);
    const res = await request(app).post(`/api/tournaments/${tournament.id}/enrollments`).set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(409);
  });
});

describe('DELETE /api/tournaments/:id/enrollments (cancelar)', () => {
  it('deve cancelar inscrição', async () => {
    const { tournament } = await setupOpen();
    const { token } = await createUser();
    await request(app).post(`/api/tournaments/${tournament.id}/enrollments`).set('Authorization', `Bearer ${token}`);
    const res = await request(app).delete(`/api/tournaments/${tournament.id}/enrollments`).set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(204);
  });
});

describe('GET /api/tournaments/:id/enrollments', () => {
  it('organizador vê lista de inscritos com contagens', async () => {
    const { orgToken, tournament } = await setupOpen();
    const { user: p1, token: t1 } = await createUser();
    const { user: p2, token: t2 } = await createUser();
    await request(app).post(`/api/tournaments/${tournament.id}/enrollments`).set('Authorization', `Bearer ${t1}`);
    await request(app).post(`/api/tournaments/${tournament.id}/enrollments`).set('Authorization', `Bearer ${t2}`);
    await request(app).patch(`/api/tournaments/${tournament.id}/enrollments/${p1.id}/validate`).set('Authorization', `Bearer ${orgToken}`);

    const res = await request(app).get(`/api/tournaments/${tournament.id}/enrollments`).set('Authorization', `Bearer ${orgToken}`);
    expect(res.status).toBe(200);
    expect(res.body.total).toBe(2);
    expect(res.body.confirmed).toBe(1);
    expect(res.body.pending).toBe(1);
  });

  it('deve retornar 403 para não-organizador', async () => {
    const { tournament } = await setupOpen();
    const { token } = await createUser();
    const res = await request(app).get(`/api/tournaments/${tournament.id}/enrollments`).set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(403);
  });
});

describe('PATCH /api/tournaments/:id/enrollments/:userId/validate', () => {
  it('deve validar pagamento de um inscrito', async () => {
    const { orgToken, tournament } = await setupOpen();
    const { user, token } = await createUser();
    await request(app).post(`/api/tournaments/${tournament.id}/enrollments`).set('Authorization', `Bearer ${token}`);
    const res = await request(app).patch(`/api/tournaments/${tournament.id}/enrollments/${user.id}/validate`).set('Authorization', `Bearer ${orgToken}`);
    expect(res.status).toBe(200);
    expect(res.body.enrollment.paymentValidated).toBe(true);
  });
});

describe('DELETE /api/tournaments/:id/enrollments/:userId (remover)', () => {
  it('organizador remove jogador', async () => {
    const { orgToken, tournament } = await setupOpen();
    const { user, token } = await createUser();
    await request(app).post(`/api/tournaments/${tournament.id}/enrollments`).set('Authorization', `Bearer ${token}`);
    const res = await request(app).delete(`/api/tournaments/${tournament.id}/enrollments/${user.id}`).set('Authorization', `Bearer ${orgToken}`);
    expect(res.status).toBe(204);
  });
});
