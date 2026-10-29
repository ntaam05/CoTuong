export type PieceColor = 'red' | 'black';
export type PieceType = 'king' | 'advisor' | 'elephant' | 'horse' | 'rook' | 'cannon' | 'pawn';

export interface Piece {
  type: PieceType;
  color: PieceColor;
}

export type BoardPosition = (Piece | null)[][]; // 10 rows x 9 cols

export interface Position {
  row: number; // 0..9
  col: number; // 0..8
}

export interface Move {
  from: Position;
  to: Position;
  piece: Piece;
  captured?: Piece | null;
  notation?: string;
  isCheck?: boolean;
}

export interface GameState {
  board: BoardPosition;
  currentTurn: PieceColor;
  isCheck: boolean;
  isCheckmate: boolean;
  isStalemate: boolean;
  winner: PieceColor | 'draw' | null;
  moveHistory: Move[];
  capturedRed: Piece[];
  capturedBlack: Piece[];
}

export interface UserSession {
  id: string;
  email: string;
  name: string;
  avatar: string;
  level: number;
  xp: number;
  wins: number;
  losses: number;
  draws: number;
}
