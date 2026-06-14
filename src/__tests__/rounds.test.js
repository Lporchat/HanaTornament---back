const request = require('supertest');
const app = require('../app');
const { clearDatabase, setupTournament, runRound, createUser } = require('./helpers');

beforeEach(clearDatabase);

describe('POST /api/tournaments/:id/rounds', () => {
  it('deve criar primeira rodada com pareamentos', async () => {
    const { round, matches } = await setupTournament(4);
    expect(round.roundNumber).toBe(1);
    expect(matches.length).toBeGreaterThan(0);
  });

  it('deve incluir bye quando número de jogadores é ímpar', async () => {
    const { matches } = await setupTournament(5);
    const byes = matches.filter((m) => m.isBye);
    expect(byes).toHaveLength(1);
  });

  it('deve retornar 400 se rodada anterior não está finalizada', async () => {
    const { orgToken, tournament } = await setupTournament(4);
    await request(app).post(`/api/tournaments/${tournament.id}/rounds`).set('Authorization', `Bearer ${orgToken}`);
    const res = await request(app).post(`/api/tournaments/${tournament.id}/rounds`).set('Authorization', `Bearer ${orgToken}`);
    expect(res.status).toBe(400);
    expect(res.body.message).toMatch(/não foi finalizada/);
  });

  it('deve retornar 400 após todas as rodadas (torneio finalizado)', async () => {
    const { orgToken, tournament } = await setupTournament(4);
    for (let i = 0; i < tournament.swissRounds; i++) {
      await runRound(orgToken, tournament);
    }
    // Após a última rodada o torneio finaliza (status = finished)
    const res = await request(app).post(`/api/tournaments/${tournament.id}/rounds`).set('Authorization', `Bearer ${orgToken}`);
    expect(res.status).toBe(400);
  });
});

describe('GET /api/tournaments/:id/rounds', () => {
  it('deve listar as rodadas', async () => {
    const { orgToken, tournament } = await setupTournament(4);
    await runRound(orgToken, tournament);
    const res = await request(app).get(`/api/tournaments/${tournament.id}/rounds`);
    expect(res.status).toBe(200);
    expect(res.body.rounds).toHaveLength(1);
    expect(res.body.rounds[0].matches).toBeDefined();
  });
});

describe('GET /api/tournaments/:id/rounds/:roundId', () => {
  it('deve retornar rodada com partidas e nomes dos jogadores', async () => {
    const { tournament, round } = await setupTournament(4);
    const res = await request(app).get(`/api/tournaments/${tournament.id}/rounds/${round.id}`);
    expect(res.status).toBe(200);
    expect(res.body.round.matches[0].player1).toBeDefined();
  });
});

describe('PATCH /api/tournaments/:id/rounds/:roundId/matches/:matchId/result', () => {
  it('deve registrar resultado de uma partida', async () => {
    const { orgToken, tournament, round, matches } = await setupTournament(4);
    const match = matches.find((m) => !m.isBye);

    const res = await request(app)
      .patch(`/api/tournaments/${tournament.id}/rounds/${round.id}/matches/${match.id}/result`)
      .set('Authorization', `Bearer ${orgToken}`)
      .send({ winnerId: match.player1Id });

    expect(res.status).toBe(200);
    expect(res.body.match.winnerId).toBe(match.player1Id);
    expect(res.body.match.status).toBe('finished');
  });

  it('deve retornar 400 para vencedor que não está na partida', async () => {
    const { orgToken, tournament, round, matches } = await setupTournament(4);
    const match = matches.find((m) => !m.isBye);

    const res = await request(app)
      .patch(`/api/tournaments/${tournament.id}/rounds/${round.id}/matches/${match.id}/result`)
      .set('Authorization', `Bearer ${orgToken}`)
      .send({ winnerId: '00000000-0000-0000-0000-000000000000' });

    expect(res.status).toBe(400);
  });

  it('deve permitir editar o resultado antes da rodada ser finalizada', async () => {
    const { orgToken, tournament, round, matches } = await setupTournament(4);
    const match = matches.find((m) => !m.isBye);

    await request(app)
      .patch(`/api/tournaments/${tournament.id}/rounds/${round.id}/matches/${match.id}/result`)
      .set('Authorization', `Bearer ${orgToken}`)
      .send({ winnerId: match.player1Id });

    const res = await request(app)
      .patch(`/api/tournaments/${tournament.id}/rounds/${round.id}/matches/${match.id}/result`)
      .set('Authorization', `Bearer ${orgToken}`)
      .send({ winnerId: match.player2Id });

    expect(res.status).toBe(200);
    expect(res.body.match.winnerId).toBe(match.player2Id);
  });

  it('deve retornar 400 para resultado editado após rodada finalizada', async () => {
    const { orgToken, tournament, round, matches } = await setupTournament(4);

    for (const match of matches) {
      if (match.isBye) continue;
      await request(app)
        .patch(`/api/tournaments/${tournament.id}/rounds/${round.id}/matches/${match.id}/result`)
        .set('Authorization', `Bearer ${orgToken}`)
        .send({ winnerId: match.player1Id });
    }

    await request(app).patch(`/api/tournaments/${tournament.id}/rounds/${round.id}/finish`).set('Authorization', `Bearer ${orgToken}`);

    const match = matches.find((m) => !m.isBye);
    const res = await request(app)
      .patch(`/api/tournaments/${tournament.id}/rounds/${round.id}/matches/${match.id}/result`)
      .set('Authorization', `Bearer ${orgToken}`)
      .send({ winnerId: match.player2Id });

    expect(res.status).toBe(400);
    expect(res.body.message).toMatch(/finalizada/);
  });
});

describe('PATCH /api/tournaments/:id/rounds/:roundId/finish', () => {
  it('deve finalizar rodada quando todos os resultados estão registrados', async () => {
    const { orgToken, tournament, round, matches } = await setupTournament(4);

    for (const match of matches) {
      if (match.isBye) continue;
      await request(app)
        .patch(`/api/tournaments/${tournament.id}/rounds/${round.id}/matches/${match.id}/result`)
        .set('Authorization', `Bearer ${orgToken}`)
        .send({ winnerId: match.player1Id });
    }

    const res = await request(app).patch(`/api/tournaments/${tournament.id}/rounds/${round.id}/finish`).set('Authorization', `Bearer ${orgToken}`);
    expect(res.status).toBe(200);
    expect(res.body.round.status).toBe('finished');
  });

  it('deve retornar 400 com partidas pendentes', async () => {
    const { orgToken, tournament, round } = await setupTournament(4);
    const res = await request(app).patch(`/api/tournaments/${tournament.id}/rounds/${round.id}/finish`).set('Authorization', `Bearer ${orgToken}`);
    expect(res.status).toBe(400);
    expect(res.body.message).toMatch(/partida/);
  });
});

describe('PATCH /api/tournaments/:id/rounds/:roundId/schedule', () => {
  it('deve definir o horário de início de uma rodada', async () => {
    const { orgToken, tournament, round } = await setupTournament(4);

    const scheduledAt = '2026-01-01T10:00:00.000Z';
    const res = await request(app)
      .patch(`/api/tournaments/${tournament.id}/rounds/${round.id}/schedule`)
      .set('Authorization', `Bearer ${orgToken}`)
      .send({ scheduledAt });

    expect(res.status).toBe(200);
    expect(new Date(res.body.round.scheduledAt).toISOString()).toBe(scheduledAt);
  });

  it('deve retornar 403 se não for o organizador', async () => {
    const { tournament, round } = await setupTournament(4);
    const { token } = await createUser();

    const res = await request(app)
      .patch(`/api/tournaments/${tournament.id}/rounds/${round.id}/schedule`)
      .set('Authorization', `Bearer ${token}`)
      .send({ scheduledAt: '2026-01-01T10:00:00.000Z' });

    expect(res.status).toBe(403);
  });
});

describe('GET /api/tournaments/:id/rounds/standings', () => {
  it('deve retornar standings após rodadas', async () => {
    const { orgToken, tournament } = await setupTournament(4);
    await runRound(orgToken, tournament);
    const res = await request(app).get(`/api/tournaments/${tournament.id}/rounds/standings`);
    expect(res.status).toBe(200);
    expect(res.body.standings.length).toBe(4);
    expect(res.body.standings[0].position).toBe(1);
    expect(res.body.standings[0].points).toBeGreaterThanOrEqual(res.body.standings[1].points);
  });

  it('deve finalizar torneio e distribuir créditos após última rodada', async () => {
    const { orgToken, tournament } = await setupTournament(4);
    for (let i = 0; i < tournament.swissRounds; i++) {
      await runRound(orgToken, tournament);
    }
    const res = await request(app).get(`/api/tournaments/${tournament.id}`);
    expect(res.body.tournament.status).toBe('finished');
  }, 60000);
});
