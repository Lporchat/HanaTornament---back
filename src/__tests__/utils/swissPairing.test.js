const { generatePairings } = require('../../utils/swissPairing');

const makePlayer = (id, wins = 0, losses = 0, opts = {}) => ({
  userId: id,
  wins,
  draws: opts.draws || 0,
  losses,
  byes: 0,
  byeReceived: opts.byeReceived || false,
  previousOpponents: new Set(opts.previousOpponents || []),
});

describe('generatePairings', () => {
  it('deve gerar N/2 pares para número par de jogadores', () => {
    const players = ['a', 'b', 'c', 'd'].map((id) => makePlayer(id));
    const { pairs, bye } = generatePairings(players);
    expect(pairs).toHaveLength(2);
    expect(bye).toBeNull();
  });

  it('deve gerar (N-1)/2 pares e 1 bye para número ímpar', () => {
    const players = ['a', 'b', 'c', 'd', 'e'].map((id) => makePlayer(id));
    const { pairs, bye } = generatePairings(players);
    expect(pairs).toHaveLength(2);
    expect(bye).not.toBeNull();
  });

  it('nenhum jogador deve aparecer em mais de uma partida', () => {
    const players = ['a', 'b', 'c', 'd', 'e', 'f'].map((id) => makePlayer(id));
    const { pairs, bye } = generatePairings(players);
    const used = new Set([...pairs.flatMap((p) => [p.p1, p.p2]), bye].filter(Boolean));
    expect(used.size).toBe(6);
  });

  it('deve evitar rematches quando possível', () => {
    const players = [
      makePlayer('a', 1, 0, { previousOpponents: ['b'] }),
      makePlayer('b', 0, 1, { previousOpponents: ['a'] }),
      makePlayer('c', 1, 0),
      makePlayer('d', 0, 1),
    ];
    const { pairs } = generatePairings(players);
    const hasRematch = pairs.some(
      (p) => (p.p1 === 'a' && p.p2 === 'b') || (p.p1 === 'b' && p.p2 === 'a')
    );
    expect(hasRematch).toBe(false);
  });

  it('deve dar bye para jogador que ainda não recebeu', () => {
    const players = [
      makePlayer('a', 1, 0, { byeReceived: true }),
      makePlayer('b', 0, 1),
      makePlayer('c', 1, 0),
    ];
    const { bye } = generatePairings(players);
    expect(bye).toBe('b');
  });

  it('deve parear jogadores de pontuações similares', () => {
    const players = [
      makePlayer('a', 3, 0),
      makePlayer('b', 3, 0),
      makePlayer('c', 0, 3),
      makePlayer('d', 0, 3),
    ];
    const { pairs } = generatePairings(players);
    const topPair = pairs.find((p) => (p.p1 === 'a' && p.p2 === 'b') || (p.p1 === 'b' && p.p2 === 'a'));
    expect(topPair).toBeDefined();
  });
});
