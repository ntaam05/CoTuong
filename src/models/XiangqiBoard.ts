import { BoardPosition, Move, Piece, PieceColor, Position } from './types';

export class XiangqiEngine {
  // Initialize standard starting Xiangqi board (10 rows x 9 cols)
  // Row 0 is Red back rank, Row 9 is Black back rank
  static getInitialBoard(): BoardPosition {
    const board: BoardPosition = Array(10)
      .fill(null)
      .map(() => Array(9).fill(null));

    // Red pieces (Row 0..3)
    board[0][0] = { type: 'rook', color: 'red' };
    board[0][1] = { type: 'horse', color: 'red' };
    board[0][2] = { type: 'elephant', color: 'red' };
    board[0][3] = { type: 'advisor', color: 'red' };
    board[0][4] = { type: 'king', color: 'red' };
    board[0][5] = { type: 'advisor', color: 'red' };
    board[0][6] = { type: 'elephant', color: 'red' };
    board[0][7] = { type: 'horse', color: 'red' };
    board[0][8] = { type: 'rook', color: 'red' };
    board[2][1] = { type: 'cannon', color: 'red' };
    board[2][7] = { type: 'cannon', color: 'red' };
    board[3][0] = { type: 'pawn', color: 'red' };
    board[3][2] = { type: 'pawn', color: 'red' };
    board[3][4] = { type: 'pawn', color: 'red' };
    board[3][6] = { type: 'pawn', color: 'red' };
    board[3][8] = { type: 'pawn', color: 'red' };

    // Black pieces (Row 6..9)
    board[9][0] = { type: 'rook', color: 'black' };
    board[9][1] = { type: 'horse', color: 'black' };
    board[9][2] = { type: 'elephant', color: 'black' };
    board[9][3] = { type: 'advisor', color: 'black' };
    board[9][4] = { type: 'king', color: 'black' };
    board[9][5] = { type: 'advisor', color: 'black' };
    board[9][6] = { type: 'elephant', color: 'black' };
    board[9][7] = { type: 'horse', color: 'black' };
    board[9][8] = { type: 'rook', color: 'black' };
    board[7][1] = { type: 'cannon', color: 'black' };
    board[7][7] = { type: 'cannon', color: 'black' };
    board[6][0] = { type: 'pawn', color: 'black' };
    board[6][2] = { type: 'pawn', color: 'black' };
    board[6][4] = { type: 'pawn', color: 'black' };
    board[6][6] = { type: 'pawn', color: 'black' };
    board[6][8] = { type: 'pawn', color: 'black' };

    return board;
  }

  static cloneBoard(board: BoardPosition): BoardPosition {
    return board.map((row) => row.map((cell) => (cell ? { ...cell } : null)));
  }

  static isInsideBoard(row: number, col: number): boolean {
    return row >= 0 && row < 10 && col >= 0 && col < 9;
  }

  static isInsidePalace(row: number, col: number, color: PieceColor): boolean {
    if (col < 3 || col > 5) return false;
    return color === 'red' ? row >= 0 && row <= 2 : row >= 7 && row <= 9;
  }

  static findKing(board: BoardPosition, color: PieceColor): Position | null {
    for (let r = 0; r < 10; r++) {
      for (let c = 0; c < 9; c++) {
        const piece = board[r][c];
        if (piece && piece.type === 'king' && piece.color === color) {
          return { row: r, col: c };
        }
      }
    }
    return null;
  }

  // Flying general rule: if kings face each other on the same column with no pieces between
  static areKingsFacing(board: BoardPosition): boolean {
    const redKing = this.findKing(board, 'red');
    const blackKing = this.findKing(board, 'black');
    if (!redKing || !blackKing) return false;
    if (redKing.col !== blackKing.col) return false;

    const minRow = Math.min(redKing.row, blackKing.row);
    const maxRow = Math.max(redKing.row, blackKing.row);
    const col = redKing.col;

    for (let r = minRow + 1; r < maxRow; r++) {
      if (board[r][col] !== null) {
        return false;
      }
    }
    return true;
  }

  // Generate pseudo-legal moves for a specific piece
  static getPseudoLegalMoves(board: BoardPosition, pos: Position): Position[] {
    const piece = board[pos.row][pos.col];
    if (!piece) return [];
    const moves: Position[] = [];
    const { row, col } = pos;
    const { color, type } = piece;

    switch (type) {
      case 'king': {
        const deltas = [
          [-1, 0],
          [1, 0],
          [0, -1],
          [0, 1],
        ];
        for (const [dr, dc] of deltas) {
          const nr = row + dr;
          const nc = col + dc;
          if (this.isInsidePalace(nr, nc, color)) {
            const dest = board[nr][nc];
            if (!dest || dest.color !== color) {
              moves.push({ row: nr, col: nc });
            }
          }
        }
        break;
      }

      case 'advisor': {
        const deltas = [
          [-1, -1],
          [-1, 1],
          [1, -1],
          [1, 1],
        ];
        for (const [dr, dc] of deltas) {
          const nr = row + dr;
          const nc = col + dc;
          if (this.isInsidePalace(nr, nc, color)) {
            const dest = board[nr][nc];
            if (!dest || dest.color !== color) {
              moves.push({ row: nr, col: nc });
            }
          }
        }
        break;
      }

      case 'elephant': {
        const deltas = [
          [-2, -2],
          [-2, 2],
          [2, -2],
          [2, 2],
        ];
        for (const [dr, dc] of deltas) {
          const nr = row + dr;
          const nc = col + dc;
          // Elephant cannot cross river: Red rows 0..4, Black rows 5..9
          const riverOk = color === 'red' ? nr >= 0 && nr <= 4 : nr >= 5 && nr <= 9;
          if (riverOk && this.isInsideBoard(nr, nc)) {
            // Check elephant eye (cản tượng)
            const eyeR = row + dr / 2;
            const eyeC = col + dc / 2;
            if (board[eyeR][eyeC] === null) {
              const dest = board[nr][nc];
              if (!dest || dest.color !== color) {
                moves.push({ row: nr, col: nc });
              }
            }
          }
        }
        break;
      }

      case 'horse': {
        const jumps = [
          { dr: -2, dc: -1, eyeR: -1, eyeC: 0 },
          { dr: -2, dc: 1, eyeR: -1, eyeC: 0 },
          { dr: 2, dc: -1, eyeR: 1, eyeC: 0 },
          { dr: 2, dc: 1, eyeR: 1, eyeC: 0 },
          { dr: -1, dc: -2, eyeR: 0, eyeC: -1 },
          { dr: 1, dc: -2, eyeR: 0, eyeC: -1 },
          { dr: -1, dc: 2, eyeR: 0, eyeC: 1 },
          { dr: 1, dc: 2, eyeR: 0, eyeC: 1 },
        ];
        for (const j of jumps) {
          const nr = row + j.dr;
          const nc = col + j.dc;
          if (this.isInsideBoard(nr, nc)) {
            // Check horse leg (cản mã)
            if (board[row + j.eyeR][col + j.eyeC] === null) {
              const dest = board[nr][nc];
              if (!dest || dest.color !== color) {
                moves.push({ row: nr, col: nc });
              }
            }
          }
        }
        break;
      }

      case 'rook': {
        const dirs = [
          [-1, 0],
          [1, 0],
          [0, -1],
          [0, 1],
        ];
        for (const [dr, dc] of dirs) {
          let step = 1;
          while (true) {
            const nr = row + dr * step;
            const nc = col + dc * step;
            if (!this.isInsideBoard(nr, nc)) break;
            const dest = board[nr][nc];
            if (dest === null) {
              moves.push({ row: nr, col: nc });
            } else {
              if (dest.color !== color) {
                moves.push({ row: nr, col: nc });
              }
              break;
            }
            step++;
          }
        }
        break;
      }

      case 'cannon': {
        const dirs = [
          [-1, 0],
          [1, 0],
          [0, -1],
          [0, 1],
        ];
        for (const [dr, dc] of dirs) {
          let step = 1;
          let jumped = false;
          while (true) {
            const nr = row + dr * step;
            const nc = col + dc * step;
            if (!this.isInsideBoard(nr, nc)) break;
            const dest = board[nr][nc];
            if (!jumped) {
              if (dest === null) {
                moves.push({ row: nr, col: nc });
              } else {
                jumped = true; // Screen piece encountered
              }
            } else {
              if (dest !== null) {
                if (dest.color !== color) {
                  moves.push({ row: nr, col: nc });
                }
                break; // Cannon can only jump once
              }
            }
            step++;
          }
        }
        break;
      }

      case 'pawn': {
        const forward = color === 'red' ? 1 : -1;
        const crossedRiver = color === 'red' ? row >= 5 : row <= 4;

        // Forward 1 step
        const fRow = row + forward;
        if (this.isInsideBoard(fRow, col)) {
          const dest = board[fRow][col];
          if (!dest || dest.color !== color) {
            moves.push({ row: fRow, col });
          }
        }

        // Horizontal moves if crossed river
        if (crossedRiver) {
          for (const dc of [-1, 1]) {
            const nc = col + dc;
            if (this.isInsideBoard(row, nc)) {
              const dest = board[row][nc];
              if (!dest || dest.color !== color) {
                moves.push({ row, col: nc });
              }
            }
          }
        }
        break;
      }
    }

    return moves;
  }

  // Check if a color is currently in check
  static isInCheck(board: BoardPosition, color: PieceColor): boolean {
    const kingPos = this.findKing(board, color);
    if (!kingPos) return true; // Captured king = checked

    if (this.areKingsFacing(board)) return true;

    const opponentColor = color === 'red' ? 'black' : 'red';
    for (let r = 0; r < 10; r++) {
      for (let c = 0; c < 9; c++) {
        const piece = board[r][c];
        if (piece && piece.color === opponentColor) {
          const pseudoMoves = this.getPseudoLegalMoves(board, { row: r, col: c });
          for (const m of pseudoMoves) {
            if (m.row === kingPos.row && m.col === kingPos.col) {
              return true;
            }
          }
        }
      }
    }
    return false;
  }

  // Get only truly legal moves (which do not leave own king in check or face kings)
  static getLegalMoves(board: BoardPosition, pos: Position): Position[] {
    const piece = board[pos.row][pos.col];
    if (!piece) return [];
    const pseudoMoves = this.getPseudoLegalMoves(board, pos);
    const legalMoves: Position[] = [];

    for (const target of pseudoMoves) {
      // Simulate move
      const cloned = this.cloneBoard(board);
      cloned[target.row][target.col] = cloned[pos.row][pos.col];
      cloned[pos.row][pos.col] = null;

      // Ensure kings not facing and own king not in check
      if (!this.areKingsFacing(cloned) && !this.isInCheck(cloned, piece.color)) {
        legalMoves.push(target);
      }
    }

    return legalMoves;
  }

  // Check if current side has any legal moves
  static getAllLegalMoves(board: BoardPosition, color: PieceColor): Move[] {
    const allMoves: Move[] = [];
    for (let r = 0; r < 10; r++) {
      for (let c = 0; c < 9; c++) {
        const piece = board[r][c];
        if (piece && piece.color === color) {
          const targets = this.getLegalMoves(board, { row: r, col: c });
          for (const to of targets) {
            allMoves.push({
              from: { row: r, col: c },
              to,
              piece,
              captured: board[to.row][to.col],
              notation: this.getNotation(board, { row: r, col: c }, to),
            });
          }
        }
      }
    }
    return allMoves;
  }

  // Generate standard Vietnamese Xiangqi notation
  // e.g. "Pháo 2 bình 5", "Mã 8 tiến 7", "Xe 9 thoái 1"
  static getNotation(board: BoardPosition, from: Position, to: Position): string {
    const piece = board[from.row][from.col];
    if (!piece) return '';

    const pieceNames: Record<string, string> = {
      king: piece.color === 'red' ? 'Tướng' : 'Tướng',
      advisor: 'Sĩ',
      elephant: piece.color === 'red' ? 'Tượng' : 'Voi',
      horse: 'Mã',
      rook: 'Xe',
      cannon: 'Pháo',
      pawn: piece.color === 'red' ? 'Binh' : 'Tốt',
    };

    // Columns are 1..9 from player's right to left
    // Red: col 8 is 1, col 0 is 9
    // Black: col 0 is 1, col 8 is 9
    const fromCol = piece.color === 'red' ? 9 - from.col : from.col + 1;
    const toCol = piece.color === 'red' ? 9 - to.col : to.col + 1;

    let action = '';
    let target = '';

    if (from.row === to.row) {
      action = 'bình';
      target = `${toCol}`;
    } else {
      const isAdvance =
        piece.color === 'red' ? to.row > from.row : to.row < from.row;
      action = isAdvance ? 'tiến' : 'thoái';

      // For pieces moving straight (rook, cannon, pawn, king): target is number of steps
      if (['rook', 'cannon', 'pawn', 'king'].includes(piece.type) && from.col === to.col) {
        target = `${Math.abs(to.row - from.row)}`;
      } else {
        // Diagonal pieces (horse, elephant, advisor) or pawn moving sideways: target is destination col
        target = `${toCol}`;
      }
    }

    return `${pieceNames[piece.type]} ${fromCol} ${action} ${target}`;
  }

  // Execute a move on the board
  static applyMove(
    board: BoardPosition,
    from: Position,
    to: Position
  ): { nextBoard: BoardPosition; move: Move; isCheck: boolean } {
    const piece = board[from.row][from.col];
    if (!piece) throw new Error('No piece at source position');

    const captured = board[to.row][to.col];
    const notation = this.getNotation(board, from, to);

    const nextBoard = this.cloneBoard(board);
    nextBoard[to.row][to.col] = piece;
    nextBoard[from.row][from.col] = null;

    const opponentColor = piece.color === 'red' ? 'black' : 'red';
    const isCheck = this.isInCheck(nextBoard, opponentColor);

    const move: Move = {
      from,
      to,
      piece,
      captured,
      notation,
      isCheck,
    };

    return { nextBoard, move, isCheck };
  }
}
