export type Player = 'X' | 'O';
export type CellValue = Player | null;

export type BoardStatus = 'ACTIVE' | 'WON_X' | 'WON_O' | 'DRAW';

// A single cell in a small board
export interface Cell {
  row: number;
  col: number;
  value: CellValue;
}

// A 3x3 small board
// We can represent it as a flat array of 9 cells or 3x3 array.
// 2D array [row][col] is often easier for coordinate logic.
export interface SmallBoard {
  row: number; // Row in the Main Board
  col: number; // Col in the Main Board
  cells: CellValue[][]; // 3x3
  status: BoardStatus;
}

// Global Game State
export interface GameState {
  boards: SmallBoard[][]; // 3x3 grid of SmallBoards
  activePlayer: Player;
  // If activeBoard is null, the player can play anywhere (Free Move).
  // Otherwise, they must play in the board at [row][col].
  activeBoard: { row: number; col: number } | null;
  winner: Player | 'DRAW' | null;
  history: GameState[]; // For undo (optional, but good for design)
}

export const INITIAL_PLAYER: Player = 'X';
