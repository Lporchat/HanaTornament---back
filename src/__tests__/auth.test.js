const request = require('supertest');
const app = require('../app');
const { clearDatabase, generateCpf } = require('./helpers');

beforeEach(clearDatabase);

const validUser = () => ({
  fullName: 'João da Silva',
  email: `joao_${Date.now()}@test.com`,
  password: 'senha123',
  cpf: generateCpf(),
  birthDate: '1990-05-20',
});

describe('POST /api/auth/register', () => {
  it('deve registrar um usuário com dados válidos', async () => {
    const res = await request(app).post('/api/auth/register').send(validUser());
    expect(res.status).toBe(201);
    expect(res.body.token).toBeDefined();
    expect(res.body.user.email).toBeDefined();
    expect(res.body.user.password).toBeUndefined();
  });

  it('deve retornar 400 se campos obrigatórios estão faltando', async () => {
    const res = await request(app).post('/api/auth/register').send({ email: 'x@x.com' });
    expect(res.status).toBe(400);
  });

  it('deve retornar 400 para CPF inválido', async () => {
    const res = await request(app).post('/api/auth/register').send({ ...validUser(), cpf: '00000000000' });
    expect(res.status).toBe(400);
    expect(res.body.message).toMatch(/CPF inválido/);
  });

  it('deve retornar 409 para email duplicado', async () => {
    const user = validUser();
    await request(app).post('/api/auth/register').send(user);
    const res = await request(app).post('/api/auth/register').send({ ...validUser(), email: user.email });
    expect(res.status).toBe(409);
    expect(res.body.message).toMatch(/E-mail/);
  });

  it('deve retornar 409 para CPF duplicado', async () => {
    const user = validUser();
    await request(app).post('/api/auth/register').send(user);
    const res = await request(app).post('/api/auth/register').send({ ...validUser(), cpf: user.cpf });
    expect(res.status).toBe(409);
    expect(res.body.message).toMatch(/CPF/);
  });

  it('deve registrar uma loja e criar sua organização', async () => {
    const res = await request(app).post('/api/auth/register').send({
      ...validUser(), role: 'store', storeName: 'Loja do João',
    });
    expect(res.status).toBe(201);
    expect(res.body.user.role).toBe('store');

    const orgsRes = await request(app).get('/api/organizations').set('Authorization', `Bearer ${res.body.token}`);
    expect(orgsRes.body.organizations).toHaveLength(1);
    expect(orgsRes.body.organizations[0].name).toBe('Loja do João');
  });

  it('deve retornar 400 ao registrar loja sem nome da loja', async () => {
    const res = await request(app).post('/api/auth/register').send({ ...validUser(), role: 'store' });
    expect(res.status).toBe(400);
  });

  it('usuário comum deve ter role player por padrão', async () => {
    const res = await request(app).post('/api/auth/register').send(validUser());
    expect(res.status).toBe(201);
    expect(res.body.user.role).toBe('player');
  });
});

describe('POST /api/auth/login', () => {
  it('deve logar com credenciais corretas', async () => {
    const user = validUser();
    await request(app).post('/api/auth/register').send(user);
    const res = await request(app).post('/api/auth/login').send({ email: user.email, password: user.password });
    expect(res.status).toBe(200);
    expect(res.body.token).toBeDefined();
  });

  it('deve retornar 400 se campos estão faltando', async () => {
    const res = await request(app).post('/api/auth/login').send({ email: 'x@x.com' });
    expect(res.status).toBe(400);
  });

  it('deve retornar 401 para senha errada', async () => {
    const user = validUser();
    await request(app).post('/api/auth/register').send(user);
    const res = await request(app).post('/api/auth/login').send({ email: user.email, password: 'errada' });
    expect(res.status).toBe(401);
  });

  it('deve retornar 401 para email inexistente', async () => {
    const res = await request(app).post('/api/auth/login').send({ email: 'naoexiste@test.com', password: '123' });
    expect(res.status).toBe(401);
  });
});

describe('GET /api/auth/me', () => {
  it('deve retornar dados do usuário com token válido', async () => {
    const user = validUser();
    const reg = await request(app).post('/api/auth/register').send(user);
    const res = await request(app).get('/api/auth/me').set('Authorization', `Bearer ${reg.body.token}`);
    expect(res.status).toBe(200);
    expect(res.body.user.email).toBe(user.email);
  });

  it('deve retornar 401 sem token', async () => {
    const res = await request(app).get('/api/auth/me');
    expect(res.status).toBe(401);
  });

  it('deve retornar 401 com token inválido', async () => {
    const res = await request(app).get('/api/auth/me').set('Authorization', 'Bearer token_invalido');
    expect(res.status).toBe(401);
  });
});
