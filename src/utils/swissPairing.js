// Pontuação: vitória = 3pts, empate = 1pt, bye = 3pts, derrota = 0pts
const calcPoints = (wins, draws, losses) => wins * 3 + draws * 1;

const shuffle = (arr) => {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
};

/**
 * Gera os pares de uma rodada Swiss.
 * @param {Array} players - [{ userId, wins, losses, byeReceived, previousOpponents: Set }]
 * @returns {{ pairs: [{p1, p2}], bye: userId|null }}
 */
const generatePairings = (players) => {
  // Ordena por pontos (desc), embaralha dentro do mesmo grupo pra variar
  const sorted = [...players].sort((a, b) => {
    const diff = calcPoints(b.wins, b.draws, b.losses) - calcPoints(a.wins, a.draws, a.losses);
    return diff !== 0 ? diff : Math.random() - 0.5;
  });

  const paired = new Set();
  const pairs = [];
  let byePlayer = null;

  // Se número ímpar, dá bye pro último não pareado que ainda não recebeu bye
  const needsBye = sorted.length % 2 !== 0;

  if (needsBye) {
    for (let i = sorted.length - 1; i >= 0; i--) {
      if (!sorted[i].byeReceived) {
        byePlayer = sorted[i].userId;
        paired.add(byePlayer);
        break;
      }
    }
    // Se todos já receberam bye, dá pro último mesmo
    if (!byePlayer) {
      byePlayer = sorted[sorted.length - 1].userId;
      paired.add(byePlayer);
    }
  }

  for (let i = 0; i < sorted.length; i++) {
    const p1 = sorted[i];
    if (paired.has(p1.userId)) continue;

    let matched = false;
    for (let j = i + 1; j < sorted.length; j++) {
      const p2 = sorted[j];
      if (paired.has(p2.userId)) continue;
      if (p1.previousOpponents.has(p2.userId)) continue;

      pairs.push({ p1: p1.userId, p2: p2.userId });
      paired.add(p1.userId);
      paired.add(p2.userId);
      matched = true;
      break;
    }

    // Se não achou adversário sem rematche, parea com o próximo disponível
    if (!matched) {
      for (let j = i + 1; j < sorted.length; j++) {
        const p2 = sorted[j];
        if (paired.has(p2.userId)) continue;

        pairs.push({ p1: p1.userId, p2: p2.userId });
        paired.add(p1.userId);
        paired.add(p2.userId);
        break;
      }
    }
  }

  return { pairs, bye: byePlayer };
};

module.exports = { generatePairings, calcPoints };
