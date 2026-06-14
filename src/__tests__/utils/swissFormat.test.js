const { getSwissConfig, getDefaultPrizePercentages } = require('../../utils/swissFormat');

describe('getSwissConfig', () => {
  it.each([
    [4, { swissRounds: 3, topCut: 0 }],
    [8, { swissRounds: 3, topCut: 0 }],
    [9, { swissRounds: 4, topCut: 4 }],
    [16, { swissRounds: 4, topCut: 4 }],
    [17, { swissRounds: 5, topCut: 8 }],
    [32, { swissRounds: 5, topCut: 8 }],
    [33, { swissRounds: 6, topCut: 16 }],
    [64, { swissRounds: 6, topCut: 16 }],
    [65, { swissRounds: 7, topCut: 32 }],
    [128, { swissRounds: 7, topCut: 32 }],
    [129, { swissRounds: 8, topCut: 32 }],
    [256, { swissRounds: 8, topCut: 32 }],
    [257, { swissRounds: 9, topCut: 32 }],
    [512, { swissRounds: 9, topCut: 32 }],
  ])('%i jogadores → %o', (count, expected) => {
    expect(getSwissConfig(count)).toEqual(expected);
  });

  it('deve retornar null para contagens fora do suportado', () => {
    expect(getSwissConfig(3)).toBeNull();
    expect(getSwissConfig(513)).toBeNull();
    expect(getSwissConfig(0)).toBeNull();
  });
});

describe('getDefaultPrizePercentages', () => {
  it('deve retornar array vazio para topCut 0', () => {
    expect(getDefaultPrizePercentages(0)).toHaveLength(0);
  });

  it('deve retornar 2 posições para topCut 4', () => {
    const result = getDefaultPrizePercentages(4);
    expect(result).toHaveLength(2);
    const total = result.reduce((s, p) => s + p.percentage, 0);
    expect(total).toBeCloseTo(100);
  });

  it('deve retornar 4 posições para topCut 8', () => {
    const result = getDefaultPrizePercentages(8);
    expect(result).toHaveLength(4);
    const total = result.reduce((s, p) => s + p.percentage, 0);
    expect(total).toBeCloseTo(100);
  });

  it('posições devem ser sequenciais começando em 1', () => {
    const result = getDefaultPrizePercentages(8);
    result.forEach((p, i) => expect(p.position).toBe(i + 1));
  });

  it('primeiro lugar deve ter maior percentual', () => {
    const result = getDefaultPrizePercentages(8);
    expect(result[0].percentage).toBeGreaterThan(result[result.length - 1].percentage);
  });
});
