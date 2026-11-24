// src/engine/constants.ts
var TRACK_SQUARE_COUNT = 52;
var START_INDICES = {
  red: 0,
  green: 13,
  yellow: 26,
  blue: 39
};
var STAR_SQUARES = [8, 21, 34, 47];
var SAFE_SQUARES = [0, 8, 13, 21, 26, 34, 39, 47];
var HOME_COLUMN_START = 51;
var FINISH_PROGRESS = 56;
function progressToAbsolute(color, progress) {
  if (!Number.isInteger(progress) || progress < 0 || progress > 50) {
    return null;
  }
  return (START_INDICES[color] + progress) % TRACK_SQUARE_COUNT;
}
function isSafeSquare(absoluteIndex) {
  return SAFE_SQUARES.some((square) => square === absoluteIndex);
}

// src/engine/settings.ts
var DEFAULT_SETTINGS = Object.freeze({
  extraTurnOnSix: true,
  extraTurnOnCapture: true,
  extraTurnOnFinish: true,
  threeSixesForfeit: true,
  needSixToLeaveYard: true,
  blocking: false,
  winCondition: "first_to_finish",
  turnTimer: 30,
  autoMoveSingleLegal: true
});

// src/engine/rng.ts
var UINT32_RANGE = 4294967296;
function createRng(seed) {
  let state = seed >>> 0;
  return () => {
    state = state + 1831565813 >>> 0;
    let value = state;
    value = Math.imul(value ^ value >>> 15, value | 1);
    value ^= value + Math.imul(value ^ value >>> 7, value | 61);
    return ((value ^ value >>> 14) >>> 0) / UINT32_RANGE;
  };
}

// src/engine/game.ts
var INITIAL_TOKEN_PROGRESS = -1;
function createStartingTokens() {
  return [
    { id: 0, progress: INITIAL_TOKEN_PROGRESS },
    { id: 1, progress: INITIAL_TOKEN_PROGRESS },
    { id: 2, progress: INITIAL_TOKEN_PROGRESS },
    { id: 3, progress: INITIAL_TOKEN_PROGRESS }
  ];
}
function createGame(roomId, players, settings) {
  if (players.length < 2 || players.length > 4) {
    throw new RangeError("A Ludo game requires between 2 and 4 players.");
  }
  const seats = new Set(players.map((player) => player.seat));
  const colors = new Set(players.map((player) => player.color));
  if (seats.size !== players.length) {
    throw new RangeError("Each player must have a unique seat.");
  }
  if (colors.size !== players.length) {
    throw new RangeError("Each player must have a unique color.");
  }
  const initializedPlayers = [...players].sort((first, second) => first.seat - second.seat).map((player) => ({
    ...player,
    removed: false,
    tokens: createStartingTokens(),
    idleTurns: 0
  }));
  const firstPlayer = initializedPlayers[0];
  if (firstPlayer === void 0) {
    throw new RangeError("A Ludo game requires at least one player.");
  }
  return {
    roomId,
    version: 0,
    phase: "awaiting_roll",
    players: initializedPlayers,
    activeSeat: firstPlayer.seat,
    dice: { value: null, consecutiveSixes: 0 },
    rolledThisTurn: false,
    extraTurnPending: false,
    legalMoves: [],
    settings: { ...settings },
    turnDeadline: null,
    log: []
  };
}

// src/engine/moves.ts
function getLegalMoves(state) {
  if (state.phase !== "awaiting_move" || state.dice.value === null) {
    return [];
  }
  const activePlayer = state.players.find(
    (player) => player.seat === state.activeSeat
  );
  if (activePlayer === void 0) {
    return [];
  }
  const dieValue = state.dice.value;
  return activePlayer.tokens.flatMap((token) => {
    const destination = getDestination(activePlayer, token, dieValue, state);
    return destination === null ? [] : [{ tokenId: token.id, to: destination }];
  });
}
function getDestination(activePlayer, token, dieValue, state) {
  if (token.progress === -1) {
    if (state.settings.needSixToLeaveYard && dieValue !== 6) {
      return null;
    }
    return 0;
  }
  if (!Number.isInteger(token.progress) || token.progress < 0 || token.progress >= FINISH_PROGRESS) {
    return null;
  }
  const destination = token.progress + dieValue;
  if (destination > FINISH_PROGRESS) {
    return null;
  }
  if (destination >= HOME_COLUMN_START) {
    return destination;
  }
  const destinationSquare = progressToAbsolute(
    activePlayer.color,
    destination
  );
  if (destinationSquare === null) {
    return null;
  }
  if (!isSafeSquare(destinationSquare) && hasOpposingStackAt(state, activePlayer, destinationSquare) || state.settings.blocking && pathContainsOpposingBlock(
    state,
    activePlayer,
    token.progress,
    destination
  )) {
    return null;
  }
  return destination;
}
function hasOpposingStackAt(state, activePlayer, square) {
  return state.players.some(
    (opponent) => opponent.color !== activePlayer.color && opponent.tokens.filter(
      (token) => progressToAbsolute(opponent.color, token.progress) === square
    ).length >= 2
  );
}
function pathContainsOpposingBlock(state, activePlayer, startingProgress, destinationProgress) {
  const blockingSquares = /* @__PURE__ */ new Set();
  for (const opponent of state.players) {
    if (opponent.color === activePlayer.color) {
      continue;
    }
    const tokenCountsBySquare = /* @__PURE__ */ new Map();
    for (const token of opponent.tokens) {
      const square = progressToAbsolute(opponent.color, token.progress);
      if (square !== null) {
        tokenCountsBySquare.set(
          square,
          (tokenCountsBySquare.get(square) ?? 0) + 1
        );
      }
    }
    for (const [square, count] of tokenCountsBySquare) {
      if (count >= 2) {
        blockingSquares.add(square);
      }
    }
  }
  const lastTrackProgress = Math.min(destinationProgress, 50);
  for (let progress = startingProgress + 1; progress <= lastTrackProgress; progress += 1) {
    const square = progressToAbsolute(activePlayer.color, progress);
    if (square !== null && blockingSquares.has(square)) {
      return true;
    }
  }
  return false;
}

// src/engine/turns.ts
function getNextSeat(state) {
  const remainingPlayers = state.players.filter(
    (player) => !player.removed && player.finishedRank === void 0
  ).sort((first, second) => first.seat - second.seat);
  const nextPlayer = remainingPlayers.find(
    (player) => player.seat > state.activeSeat
  );
  const firstPlayer = remainingPlayers[0];
  if (nextPlayer !== void 0) {
    return nextPlayer.seat;
  }
  if (firstPlayer !== void 0) {
    return firstPlayer.seat;
  }
  return state.activeSeat;
}
function advanceTurn(state) {
  if (state.phase !== "animating" && state.phase !== "awaiting_move") {
    throw new Error("The game is not ready to advance its turn.");
  }
  const noLegalMoves = state.phase === "awaiting_move" && getLegalMoves(state).length === 0;
  if (state.phase === "awaiting_move" && !noLegalMoves) {
    throw new Error("The active player still has legal moves.");
  }
  const keepTurn = state.extraTurnPending;
  const nextSeat = keepTurn ? state.activeSeat : getNextSeat(state);
  const event = state.phase === "animating" ? {
    type: "turn",
    data: {
      previousSeat: state.activeSeat,
      nextSeat,
      extraTurn: keepTurn
    }
  } : {
    type: "turn",
    data: {
      previousSeat: state.activeSeat,
      nextSeat,
      extraTurn: keepTurn,
      reason: "no_legal_moves"
    }
  };
  return {
    ...state,
    version: state.version + 1,
    phase: "awaiting_roll",
    activeSeat: nextSeat,
    dice: {
      value: null,
      consecutiveSixes: keepTurn ? state.dice.consecutiveSixes : 0
    },
    rolledThisTurn: false,
    extraTurnPending: false,
    legalMoves: [],
    turnDeadline: null,
    log: [...state.log, event]
  };
}
function removePlayer(state, seat) {
  const playerIndex = state.players.findIndex((player2) => player2.seat === seat);
  const player = state.players[playerIndex];
  if (player === void 0) {
    throw new Error(`Player at seat ${seat} does not exist.`);
  }
  if (player.removed) {
    throw new Error(`Player at seat ${seat} has already been removed.`);
  }
  if (state.phase === "finished") {
    throw new Error("Cannot remove a player after the game has finished.");
  }
  const players = state.players.map(
    (currentPlayer, index) => index === playerIndex ? {
      ...currentPlayer,
      removed: true,
      tokens: currentPlayer.tokens.map((token) => ({
        ...token,
        progress: -1
      }))
    } : currentPlayer
  );
  const remainingPlayers = players.filter(
    (currentPlayer) => !currentPlayer.removed && currentPlayer.finishedRank === void 0
  );
  const isGameOver2 = remainingPlayers.length <= 1;
  const activePlayerWasRemoved = state.activeSeat === seat;
  const nextSeat = isGameOver2 ? remainingPlayers[0]?.seat ?? state.activeSeat : activePlayerWasRemoved ? getNextSeat({ ...state, players }) : state.activeSeat;
  const nextPlayers = remainingPlayers.length === 1 ? players.map(
    (currentPlayer) => currentPlayer.seat === remainingPlayers[0]?.seat ? { ...currentPlayer, finishedRank: 1 } : currentPlayer
  ) : players;
  return {
    ...state,
    version: state.version + 1,
    phase: isGameOver2 ? "finished" : activePlayerWasRemoved ? "awaiting_roll" : state.phase,
    activeSeat: nextSeat,
    players: nextPlayers,
    dice: activePlayerWasRemoved || isGameOver2 ? { value: null, consecutiveSixes: 0 } : state.dice,
    rolledThisTurn: activePlayerWasRemoved || isGameOver2 ? false : state.rolledThisTurn,
    extraTurnPending: activePlayerWasRemoved || isGameOver2 ? false : state.extraTurnPending,
    legalMoves: activePlayerWasRemoved || isGameOver2 ? [] : state.legalMoves,
    turnDeadline: activePlayerWasRemoved || isGameOver2 ? null : state.turnDeadline,
    log: [
      ...state.log,
      {
        type: "turn",
        data: {
          removedSeat: seat,
          activeSeat: nextSeat,
          reason: "player_removed",
          gameOver: isGameOver2
        }
      }
    ]
  };
}

// src/engine/roll.ts
function rollDie(state, rng) {
  if (state.rolledThisTurn) {
    throw new Error("The active player has already rolled this turn.");
  }
  if (state.phase !== "awaiting_roll") {
    throw new Error("The game is not waiting for a die roll.");
  }
  const randomValue = rng();
  if (!Number.isFinite(randomValue) || randomValue < 0 || randomValue >= 1) {
    throw new RangeError("The RNG must return a finite value in [0, 1).");
  }
  const value = Math.floor(randomValue * 6) + 1;
  const consecutiveSixes = value === 6 ? state.dice.consecutiveSixes + 1 : 0;
  const rolledEvent = { type: "rolled", data: { value } };
  if (state.settings.threeSixesForfeit && consecutiveSixes >= 3) {
    const nextSeat = getNextSeat(state);
    return {
      ...state,
      version: state.version + 1,
      phase: "awaiting_roll",
      activeSeat: nextSeat,
      dice: { value: null, consecutiveSixes: 0 },
      rolledThisTurn: false,
      extraTurnPending: false,
      legalMoves: [],
      log: [
        ...state.log,
        rolledEvent,
        {
          type: "turn",
          data: {
            seat: state.activeSeat,
            reason: "three_sixes",
            nextSeat
          }
        }
      ]
    };
  }
  return {
    ...state,
    version: state.version + 1,
    phase: "awaiting_move",
    dice: { value, consecutiveSixes },
    rolledThisTurn: true,
    extraTurnPending: state.settings.extraTurnOnSix && value === 6,
    legalMoves: [],
    log: [...state.log, rolledEvent]
  };
}

// src/engine/applyMove.ts
function applyMove(state, tokenId) {
  const legalMove = getLegalMoves(state).find(
    (move) => move.tokenId === tokenId
  );
  if (legalMove === void 0) {
    if (state.phase !== "awaiting_move" || state.dice.value === null) {
      throw new Error("The game is not waiting for a token move.");
    }
    throw new Error(`Token ${tokenId} has no legal move.`);
  }
  const activePlayerIndex = state.players.findIndex(
    (player) => player.seat === state.activeSeat
  );
  const activePlayer = state.players[activePlayerIndex];
  if (activePlayer === void 0) {
    throw new Error("The active player does not exist.");
  }
  const tokenIndex = activePlayer.tokens.findIndex(
    (token2) => token2.id === tokenId
  );
  const token = activePlayer.tokens[tokenIndex];
  if (token === void 0) {
    throw new Error(`Token ${tokenId} does not exist.`);
  }
  const updatedPlayers = state.players.map(
    (player, playerIndex) => playerIndex === activePlayerIndex ? {
      ...player,
      tokens: player.tokens.map(
        (playerToken, index) => index === tokenIndex ? { ...playerToken, progress: legalMove.to } : playerToken
      )
    } : player
  );
  const landingSquare = progressToAbsolute(
    activePlayer.color,
    legalMove.to
  );
  const opponentTokensAtLanding = landingSquare === null || isSafeSquare(landingSquare) ? [] : state.players.flatMap(
    (player, playerIndex) => player.color === activePlayer.color ? [] : player.tokens.flatMap(
      (opponentToken, opponentTokenIndex) => progressToAbsolute(player.color, opponentToken.progress) === landingSquare ? [
        {
          playerIndex,
          tokenIndex: opponentTokenIndex,
          seat: player.seat,
          tokenId: opponentToken.id
        }
      ] : []
    )
  );
  const capturedTokens = opponentTokensAtLanding.length === 1 ? opponentTokensAtLanding : [];
  const capturedIndices = new Set(
    capturedTokens.map(
      ({ playerIndex, tokenIndex: tokenIndex2 }) => `${playerIndex}:${tokenIndex2}`
    )
  );
  const playersAfterCapture = capturedIndices.size === 0 ? updatedPlayers : updatedPlayers.map((player, playerIndex) => ({
    ...player,
    tokens: player.tokens.map(
      (playerToken, tokenIndex2) => capturedIndices.has(`${playerIndex}:${tokenIndex2}`) ? { ...playerToken, progress: -1 } : playerToken
    )
  }));
  const playerWon = playersAfterCapture.some(
    (player) => player.seat === activePlayer.seat && player.tokens.length === 4 && player.tokens.every((playerToken) => playerToken.progress === FINISH_PROGRESS)
  );
  const playersWithRank = playerWon ? playersAfterCapture.map(
    (player) => player.seat === activePlayer.seat ? { ...player, finishedRank: 1 } : player
  ) : playersAfterCapture;
  const movementEvent = {
    type: "moved",
    data: {
      seat: activePlayer.seat,
      tokenId,
      from: token.progress,
      to: legalMove.to
    }
  };
  const finishedEvent = legalMove.to === FINISH_PROGRESS ? {
    type: "finished",
    data: { seat: activePlayer.seat, tokenId }
  } : null;
  const captureEvents = capturedTokens.map((captured) => ({
    type: "captured",
    data: {
      capturedSeat: captured.seat,
      capturedTokenId: captured.tokenId,
      bySeat: activePlayer.seat,
      byTokenId: tokenId,
      square: landingSquare
    }
  }));
  return {
    ...state,
    version: state.version + 1,
    phase: playerWon ? "finished" : "animating",
    players: playersWithRank,
    extraTurnPending: playerWon ? false : state.extraTurnPending || state.settings.extraTurnOnCapture && capturedTokens.length > 0 || state.settings.extraTurnOnFinish && legalMove.to === FINISH_PROGRESS,
    legalMoves: [],
    log: [
      ...state.log,
      movementEvent,
      ...captureEvents,
      ...finishedEvent === null ? [] : [finishedEvent],
      ...playerWon ? [
        {
          type: "won",
          data: { seat: activePlayer.seat, rank: 1 }
        }
      ] : []
    ]
  };
}

// src/engine/autoMove.ts
function autoMove(state) {
  if (state.phase !== "awaiting_move" || state.dice.value === null) {
    throw new Error("The game is not waiting for a token move.");
  }
  const legalMoves = getLegalMoves(state);
  if (legalMoves.length !== 1) {
    throw new Error(
      `Automatic move requires exactly one legal move; found ${legalMoves.length}.`
    );
  }
  const onlyLegalMove = legalMoves[0];
  if (onlyLegalMove === void 0) {
    throw new Error("No legal move is available.");
  }
  return applyMove(state, onlyLegalMove.tokenId);
}

// src/engine/bots.ts
function easyBot(state, rng) {
  const legalMoves = getLegalMoves(state);
  if (legalMoves.length === 0) {
    throw new Error("The active player has no legal moves.");
  }
  const selectedIndex = getRandomIndex(legalMoves.length, rng);
  const selectedMove = legalMoves[selectedIndex];
  if (selectedMove === void 0) {
    throw new RangeError("The RNG selected an invalid legal move index.");
  }
  return applyMove(state, selectedMove.tokenId);
}
function normalBot(state, rng) {
  const legalMoves = getLegalMoves(state);
  if (legalMoves.length === 0) {
    throw new Error("The active player has no legal moves.");
  }
  const activePlayer = state.players.find(
    (player) => player.seat === state.activeSeat
  );
  if (activePlayer === void 0) {
    throw new Error("The active player does not exist.");
  }
  const rankedMoves = legalMoves.map((move) => ({
    move,
    priority: getMovePriority(state, activePlayer, move)
  }));
  const firstCandidate = rankedMoves[0];
  if (firstCandidate === void 0) {
    throw new Error("The active player has no legal moves.");
  }
  const bestPriority = rankedMoves.reduce(
    (best, candidate) => comparePriority(candidate.priority, best) > 0 ? candidate.priority : best,
    firstCandidate.priority
  );
  const bestMoves = rankedMoves.filter(
    (candidate) => comparePriority(candidate.priority, bestPriority) === 0
  ).map((candidate) => candidate.move);
  const selectedIndex = getRandomIndex(bestMoves.length, rng);
  const selectedMove = bestMoves[selectedIndex];
  if (selectedMove === void 0) {
    throw new RangeError("The RNG selected an invalid legal move index.");
  }
  return applyMove(state, selectedMove.tokenId);
}
function getMovePriority(state, activePlayer, move) {
  const token = activePlayer.tokens.find(
    (currentToken) => currentToken.id === move.tokenId
  );
  if (token === void 0) {
    throw new Error(`Token ${move.tokenId} does not exist.`);
  }
  const destinationSquare = progressToAbsolute(activePlayer.color, move.to);
  const isFinish = move.to === FINISH_PROGRESS;
  const isCapture = destinationSquare !== null && !isSafeSquare(destinationSquare) && state.players.some(
    (player) => player.color !== activePlayer.color && player.tokens.filter(
      (opponentToken) => progressToAbsolute(player.color, opponentToken.progress) === destinationSquare
    ).length === 1
  );
  const leavesYard = token.progress === -1;
  const landsOnSafeSquare = destinationSquare !== null && isSafeSquare(destinationSquare);
  const exposed = destinationSquare !== null && isExposedToOpponent(state, activePlayer, move.to, destinationSquare);
  return [
    Number(isFinish),
    Number(isCapture),
    Number(leavesYard),
    Number(landsOnSafeSquare),
    move.to,
    Number(!exposed)
  ];
}
function isExposedToOpponent(state, activePlayer, destinationProgress, destinationSquare) {
  if (destinationProgress > 50 || isSafeSquare(destinationSquare)) {
    return false;
  }
  return state.players.some(
    (opponent) => opponent.color !== activePlayer.color && opponent.tokens.some((token) => {
      if (token.progress < 0 || token.progress > 50) {
        return false;
      }
      for (let dieValue = 1; dieValue <= 6; dieValue += 1) {
        if (progressToAbsolute(opponent.color, token.progress + dieValue) === destinationSquare) {
          return true;
        }
      }
      return false;
    })
  );
}
function comparePriority(first, second) {
  for (let index = 0; index < first.length; index += 1) {
    const difference = (first[index] ?? 0) - (second[index] ?? 0);
    if (difference !== 0) {
      return difference;
    }
  }
  return 0;
}
function getRandomIndex(length, rng) {
  if (length < 1) {
    throw new RangeError("Cannot select from an empty set of legal moves.");
  }
  const randomValue = rng();
  if (!Number.isFinite(randomValue) || randomValue < 0 || randomValue >= 1) {
    throw new RangeError("The RNG must return a finite value in [0, 1).");
  }
  return Math.floor(randomValue * length);
}

// src/engine/gameStatus.ts
function isWinner(player) {
  return !player.removed && player.tokens.length === 4 && player.tokens.every((token) => token.progress === FINISH_PROGRESS);
}
function isGameOver(state) {
  return state.phase === "finished" || state.players.some(isWinner) || state.players.filter(
    (player) => !player.removed && player.finishedRank === void 0
  ).length <= 1;
}
function getRanking(state) {
  const rankedPlayers = state.players.filter(
    (player) => !player.removed && player.finishedRank !== void 0
  );
  const winnerWithoutRank = state.players.find(
    (player) => player.finishedRank === void 0 && isWinner(player)
  );
  const ranking = winnerWithoutRank === void 0 ? rankedPlayers : [
    ...rankedPlayers,
    { ...winnerWithoutRank, finishedRank: 1 }
  ];
  return [...ranking].sort(
    (first, second) => (first.finishedRank ?? Number.MAX_SAFE_INTEGER) - (second.finishedRank ?? Number.MAX_SAFE_INTEGER) || first.seat - second.seat
  );
}

// src/index.ts
var VERSION = "0.1.0";
export {
  DEFAULT_SETTINGS,
  FINISH_PROGRESS,
  HOME_COLUMN_START,
  SAFE_SQUARES,
  START_INDICES,
  STAR_SQUARES,
  TRACK_SQUARE_COUNT,
  VERSION,
  advanceTurn,
  applyMove,
  autoMove,
  createGame,
  createRng,
  easyBot,
  getLegalMoves,
  getRanking,
  isGameOver,
  isSafeSquare,
  normalBot,
  progressToAbsolute,
  removePlayer,
  rollDie
};
//# sourceMappingURL=index.js.map