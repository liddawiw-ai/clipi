// Adapted from chooseBotMove by aymelkady, copyright (c) 2026, MIT.
// https://github.com/aymelkady/Jackaroo/blob/77c600759e0b3e1927504366290bcce520ddbbd5/shared/engine.js
// Full license: vendor/jackaroo.LICENSE.txt. Only Clipi's legal outcomes are scored.
import {trackSize} from './TableRules.mjs';

export function chooseJackarooMove(game, legal, random = Math.random) {
  const track = trackSize(game);
  const team = seat => seat % (game.count / 2);
  const ownTeam = team(game.turn);
  function score(move) {
    const [rank, kind] = move.id.split('/');
    let value = Math.floor(random() * 10) / 10;
    if (move.pass || !move.pieces) return -100 + value;
    let furthest = 0;
    for (let seat = 0; seat < game.count; seat++) {
      const ally = team(seat) === ownTeam;
      for (let i = 0; i < game.pieces[seat].length; i++) {
        const before = game.pieces[seat][i], after = move.pieces[seat][i];
        if (before === after) continue;
        if (after < 0) {
          value += ally ? -40 : 30;
          continue;
        }
        if (before < 0) value += 20;
        if (after >= track && before < track) value += ally ? 25 : -25;
        if (kind === 'x') value += (ally ? 1 : -1) * (after - before) / 4;
        if (ally) furthest = Math.max(furthest, after);
      }
    }
    if (rank === '7') value += 4;
    else if (rank === '4') value += 2;
    else if (kind === 'm') value += Number(rank) / 2;
    return value + furthest / track;
  }
  let best = null, highest = -Infinity;
  for (const candidate of legal) {
    const value = score(candidate);
    if (value > highest) { highest = value; best = candidate.id; }
  }
  return best;
}
