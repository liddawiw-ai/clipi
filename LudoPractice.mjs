// This adapter asks ludo-shared for a practice move. Clipi validates and applies it.
import {createGame, DEFAULT_SETTINGS, getLegalMoves, normalBot} from './vendor/ludo-shared.mjs';

const shades = ['red', 'green', 'yellow', 'blue'];
const rules = {...DEFAULT_SETTINGS, extraTurnOnCapture:false, extraTurnOnFinish:false,
  threeSixesForfeit:false, turnTimer:0, autoMoveSingleLegal:false};

export function chooseLudoMove(game, legal, random = Math.random) {
  if (!game.die || legal.length === 0) return null;
  if (legal.length === 1) return legal[0].id;

  const people = game.pieces.map((_, seat) => ({
    seat, color:shades[game.count === 2 ? 2 * seat : seat],
    playerId:String(seat), name:String(seat+1), isBot:true, connected:true
  }));
  const board = createGame('practice', people, rules);
  board.activeSeat = game.turn;
  board.phase = 'awaiting_move';
  board.rolledThisTurn = true;
  board.dice.value = game.die;
  for (const player of board.players) {
    for (const token of player.tokens) token.progress = game.pieces[player.seat][token.id];
  }
  // Our table also permits capture of a stack. The engine may have no candidate.
  if (!getLegalMoves(board).length) return legal[0].id;
  const recommendation = normalBot(board, random).log.find(event => event.type === 'moved');
  const option = legal.find(choice => Number(choice.id.split('/')[2]) === recommendation?.data.tokenId);
  return option?.id ?? legal[0].id;
}
