import { BoardPosition, Move, PieceColor, Position } from './types';
import { XiangqiEngine } from './XiangqiBoard';

const PIECE_VALUES: Record<string, number> = {
  king: 10000,
  rook: 1000,
  cannon: 450,
  horse: 420,
  elephant: 250,
  advisor: 250,
  pawn: 100,
};

// Bonus for pawns that crossed river
const CROSSED_PAWN_BONUS = 150;

export class XiangqiAI {
  // Static evaluation function from Red perspective (+ for Red, - for Black)
  static evaluateBoard(board: BoardPosition): number {
    let score = 0;

    for (let r = 0; r < 10; r++) {
      for (let c = 0; c < 9; c++) {
        const piece = board[r][c];
        if (!piece) continue;

        let val = PIECE_VALUES[piece.type] || 0;

        // Extra value for pawns crossing river
        if (piece.type === 'pawn') {
          if (piece.color === 'red' && r >= 5) {
            val += CROSSED_PAWN_BONUS + (r - 4) * 20;
          } else if (piece.color === 'black' && r <= 4) {
            val += CROSSED_PAWN_BONUS + (5 - r) * 20;
          }
        }

        // Slight positional bonus for central files (cols 3, 4, 5)
        if (c >= 3 && c <= 5) {
          val += 15;
        }

        // Active horse mobility bonus
        if (piece.type === 'horse') {
          const pseudo = XiangqiEngine.getPseudoLegalMoves(board, { row: r, col: c });
          val += pseudo.length * 5;
        }

        if (piece.color === 'red') {
          score += val;
        } else {
          score -= val;
        }
      }
    }

    return score;
  }

  // Find best move for AI
  static getBestMove(
    board: BoardPosition,
    aiColor: PieceColor,
    difficulty: 'easy' | 'hard' = 'easy'
  ): Move | null {
    const legalMoves = XiangqiEngine.getAllLegalMoves(board, aiColor);
    if (legalMoves.length === 0) return null;

    if (difficulty === 'easy') {
      // In easy mode: 40% chance of random decent move, 60% depth-1 greedy capture
      const isRandom = Math.random() < 0.35;
      if (isRandom) {
        return legalMoves[Math.floor(Math.random() * legalMoves.length)];
      }

      // Greedy shallow search
      let bestMove = legalMoves[0];
      let bestScore = aiColor === 'red' ? -Infinity : Infinity;

      for (const m of legalMoves) {
        const cloned = XiangqiEngine.cloneBoard(board);
        cloned[m.to.row][m.to.col] = cloned[m.from.row][m.from.col];
        cloned[m.from.row][m.from.col] = null;

        // Capturing pieces adds immediate score
        let score = this.evaluateBoard(cloned);
        if (m.captured) {
          score += (aiColor === 'red' ? 1 : -1) * (PIECE_VALUES[m.captured.type] || 50);
        }

        if (aiColor === 'red') {
          if (score > bestScore) {
            bestScore = score;
            bestMove = m;
          }
        } else {
          if (score < bestScore) {
            bestScore = score;
            bestMove = m;
          }
        }
      }

      return bestMove;
    }

    // Hard mode: Minimax with Alpha-Beta pruning, depth 3
    const depth = 3;
    let bestMove: Move = legalMoves[0];

    // Sort moves: prioritize captures for faster pruning
    const sortedMoves = [...legalMoves].sort((a, b) => {
      const valA = a.captured ? PIECE_VALUES[a.captured.type] : 0;
      const valB = b.captured ? PIECE_VALUES[b.captured.type] : 0;
      return valB - valA;
    });

    if (aiColor === 'red') {
      let maxEval = -Infinity;
      for (const move of sortedMoves) {
        const cloned = XiangqiEngine.cloneBoard(board);
        cloned[move.to.row][move.to.col] = cloned[move.from.row][move.from.col];
        cloned[move.from.row][move.from.col] = null;

        const evalScore = this.minimax(cloned, depth - 1, -Infinity, Infinity, false);
        if (evalScore > maxEval) {
          maxEval = evalScore;
          bestMove = move;
        }
      }
    } else {
      let minEval = Infinity;
      for (const move of sortedMoves) {
        const cloned = XiangqiEngine.cloneBoard(board);
        cloned[move.to.row][move.to.col] = cloned[move.from.row][move.from.col];
        cloned[move.from.row][move.from.col] = null;

        const evalScore = this.minimax(cloned, depth - 1, -Infinity, Infinity, true);
        if (evalScore < minEval) {
          minEval = evalScore;
          bestMove = move;
        }
      }
    }

    return bestMove;
  }

  private static minimax(
    board: BoardPosition,
    depth: number,
    alpha: number,
    beta: number,
    isMaximizing: boolean
  ): number {
    if (depth === 0) {
      return this.evaluateBoard(board);
    }

    const color: PieceColor = isMaximizing ? 'red' : 'black';
    const moves = XiangqiEngine.getAllLegalMoves(board, color);

    if (moves.length === 0) {
      // Checkmate or stalemate
      return isMaximizing ? -20000 : 20000;
    }

    if (isMaximizing) {
      let maxEval = -Infinity;
      for (const m of moves) {
        const cloned = XiangqiEngine.cloneBoard(board);
        cloned[m.to.row][m.to.col] = cloned[m.from.row][m.from.col];
        cloned[m.from.row][m.from.col] = null;

        const evaluation = this.minimax(cloned, depth - 1, alpha, beta, false);
        maxEval = Math.max(maxEval, evaluation);
        alpha = Math.max(alpha, evaluation);
        if (beta <= alpha) break; // Pruning
      }
      return maxEval;
    } else {
      let minEval = Infinity;
      for (const m of moves) {
        const cloned = XiangqiEngine.cloneBoard(board);
        cloned[m.to.row][m.to.col] = cloned[m.from.row][m.from.col];
        cloned[m.from.row][m.from.col] = null;

        const evaluation = this.minimax(cloned, depth - 1, alpha, beta, true);
        minEval = Math.min(minEval, evaluation);
        beta = Math.min(beta, evaluation);
        if (beta <= alpha) break; // Pruning
      }
      return minEval;
    }
  }
}
