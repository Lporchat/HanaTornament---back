const SWISS_TABLE = [
  { min: 4,   max: 8,   rounds: 3, topCut: 0  },
  { min: 9,   max: 16,  rounds: 4, topCut: 4  },
  { min: 17,  max: 32,  rounds: 5, topCut: 8  },
  { min: 33,  max: 64,  rounds: 6, topCut: 16 },
  { min: 65,  max: 128, rounds: 7, topCut: 32 },
  { min: 129, max: 256, rounds: 8, topCut: 32 },
  { min: 257, max: 512, rounds: 9, topCut: 32 },
];

const DEFAULT_PRIZE_PERCENTAGES = {
  4:  [60, 40],
  8:  [40, 30, 20, 10],
  16: [30, 20, 15, 10, 7, 7, 5.5, 5.5],
  32: [25, 17, 12, 10, 7, 7, 5, 5, 3, 3, 1.5, 1.5, 1, 1, 0.5, 0.5],
};

const getSwissConfig = (playerCount) => {
  const config = SWISS_TABLE.find(
    (row) => playerCount >= row.min && playerCount <= row.max
  );
  if (!config) return null;
  return { swissRounds: config.rounds, topCut: config.topCut };
};

const getDefaultPrizePercentages = (topCut) => {
  if (topCut === 0) return [];
  const percentages = DEFAULT_PRIZE_PERCENTAGES[topCut];
  if (!percentages) return [];
  return percentages.map((percentage, index) => ({
    position: index + 1,
    percentage,
  }));
};

module.exports = { getSwissConfig, getDefaultPrizePercentages };
