const request = require('supertest');
const app = require('../app');
const { clearDatabase, createUser, createOrg } = require('./helpers');

beforeEach(clearDatabase);

describe('POST /api/organizations', () => {
  it('deve criar uma organização', async () => {
    const { token } = await createUser();
    const res = await request(app).post('/api/organizations').set('Authorization', `Bearer ${token}`).send({ name: 'Minha Loja' });
    expect(res.status).toBe(201);
    expect(res.body.organization.name).toBe('Minha Loja');
  });

  it('deve retornar 400 sem nome', async () => {
    const { token } = await createUser();
    const res = await request(app).post('/api/organizations').set('Authorization', `Bearer ${token}`).send({});
    expect(res.status).toBe(400);
  });

  it('deve retornar 401 sem token', async () => {
    const res = await request(app).post('/api/organizations').send({ name: 'Loja' });
    expect(res.status).toBe(401);
  });
});

describe('GET /api/organizations', () => {
  it('deve listar somente as próprias organizações', async () => {
    const { token: t1 } = await createUser();
    const { token: t2 } = await createUser();
    await createOrg(t1, { name: 'Loja A' });
    await createOrg(t1, { name: 'Loja B' });
    await createOrg(t2, { name: 'Loja C' });

    const res = await request(app).get('/api/organizations').set('Authorization', `Bearer ${t1}`);
    expect(res.status).toBe(200);
    const names = res.body.organizations.map((o) => o.name);
    expect(names).toContain('Loja A');
    expect(names).toContain('Loja B');
    expect(names).not.toContain('Loja C');
  });
});

describe('GET /api/organizations/:id', () => {
  it('deve retornar a organização com torneios', async () => {
    const { token } = await createUser();
    const org = await createOrg(token);
    const res = await request(app).get(`/api/organizations/${org.id}`).set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body.organization.id).toBe(org.id);
    expect(res.body.organization.tournaments).toBeDefined();
  });

  it('deve retornar 404 para organização de outro usuário', async () => {
    const { token: t1 } = await createUser();
    const { token: t2 } = await createUser();
    const org = await createOrg(t1);
    const res = await request(app).get(`/api/organizations/${org.id}`).set('Authorization', `Bearer ${t2}`);
    expect(res.status).toBe(404);
  });
});

describe('PUT /api/organizations/:id', () => {
  it('deve atualizar o nome da organização', async () => {
    const { token } = await createUser();
    const org = await createOrg(token);
    const res = await request(app).put(`/api/organizations/${org.id}`).set('Authorization', `Bearer ${token}`).send({ name: 'Novo Nome' });
    expect(res.status).toBe(200);
    expect(res.body.organization.name).toBe('Novo Nome');
  });

  it('deve retornar 404 se não é o dono', async () => {
    const { token: t1 } = await createUser();
    const { token: t2 } = await createUser();
    const org = await createOrg(t1);
    const res = await request(app).put(`/api/organizations/${org.id}`).set('Authorization', `Bearer ${t2}`).send({ name: 'X' });
    expect(res.status).toBe(404);
  });
});

describe('DELETE /api/organizations/:id', () => {
  it('deve remover a organização', async () => {
    const { token } = await createUser();
    const org = await createOrg(token);
    const res = await request(app).delete(`/api/organizations/${org.id}`).set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(204);
  });

  it('deve retornar 404 se não é o dono', async () => {
    const { token: t1 } = await createUser();
    const { token: t2 } = await createUser();
    const org = await createOrg(t1);
    const res = await request(app).delete(`/api/organizations/${org.id}`).set('Authorization', `Bearer ${t2}`);
    expect(res.status).toBe(404);
  });
});
