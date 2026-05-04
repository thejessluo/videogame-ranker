export const DEFAULT_ELO = 1200;
export const K_FACTOR = 32;

export function expectedScore(playerRating: number, opponentRating: number) {
  return 1 / (1 + 10 ** ((opponentRating - playerRating) / 400));
}

export function nextRating(
  currentRating: number,
  expected: number,
  actualScore: 0 | 1,
) {
  return currentRating + K_FACTOR * (actualScore - expected);
}

export function updateEloRatings(args: {
  winnerRating: number;
  loserRating: number;
}) {
  const expectedWinner = expectedScore(args.winnerRating, args.loserRating);
  const expectedLoser = expectedScore(args.loserRating, args.winnerRating);

  const winner = nextRating(args.winnerRating, expectedWinner, 1);
  const loser = nextRating(args.loserRating, expectedLoser, 0);

  return {
    winner: Number(winner.toFixed(2)),
    loser: Number(loser.toFixed(2)),
  };
}
