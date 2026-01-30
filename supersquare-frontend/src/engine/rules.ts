import { GameState, SmallBoard, Player, CellValue, INITIAL_PLAYER } from './types';

// Helper to create an empty 3x3 grid
function createEmptyGrid(): CellValue[][] {
    return Array(3).fill(null).map(() => Array(3).fill(null));
}

export function getInitialState(): GameState {
    const boards: SmallBoard[][] = Array(3).fill(null).map((_, r) =>
        Array(3).fill(null).map((_, c) => ({
            row: r,
            col: c,
            cells: createEmptyGrid(),
            status: 'ACTIVE'
        }))
    );

    return {
        boards,
        activePlayer: INITIAL_PLAYER,
        activeBoard: null, // First move is free? Usually first move is free in Ultimate TTT? 
        // Actually, rules say "Player X plays in ANY of the 81 cells". So activeBoard is null initially.
        winner: null,
        history: []
    };
}

function checkLine(a: CellValue, b: CellValue, c: CellValue): Player | null {
    if (a && a === b && a === c) return a;
    return null;
}

// Check win for a 3x3 grid of values
function check3x3Win(cells: CellValue[][]): Player | null {
    // Rows
    for (let i = 0; i < 3; i++) {
        const winner = checkLine(cells[i][0], cells[i][1], cells[i][2]);
        if (winner) return winner;
    }
    // Cols
    for (let i = 0; i < 3; i++) {
        const winner = checkLine(cells[0][i], cells[1][i], cells[2][i]);
        if (winner) return winner;
    }
    // Diagonals
    let winner = checkLine(cells[0][0], cells[1][1], cells[2][2]);
    if (winner) return winner;
    winner = checkLine(cells[0][2], cells[1][1], cells[2][0]);
    if (winner) return winner;

    return null;
}

function isGridFull(cells: CellValue[][]): boolean {
    return cells.every(row => row.every(cell => cell !== null));
}

export function isValidMove(state: GameState, mainRow: number, mainCol: number, subRow: number, subCol: number): boolean {
    if (state.winner) return false;

    // Check bounds (paranoid check)
    if (mainRow < 0 || mainRow > 2 || mainCol < 0 || mainCol > 2) return false;
    if (subRow < 0 || subRow > 2 || subCol < 0 || subCol > 2) return false;

    const targetBoard = state.boards[mainRow][mainCol];

    // 1. Check if board is playable
    if (targetBoard.status !== 'ACTIVE') return false;

    // 2. Check if cell is empty
    if (targetBoard.cells[subRow][subCol] !== null) return false;

    // 3. Check Active Board constraint
    if (state.activeBoard) {
        if (state.activeBoard.row !== mainRow || state.activeBoard.col !== mainCol) {
            return false;
        }
    }

    return true;
}

export function makeMove(currentState: GameState, mainRow: number, mainCol: number, subRow: number, subCol: number): GameState {
    if (!isValidMove(currentState, mainRow, mainCol, subRow, subCol)) {
        throw new Error("Invalid move");
    }

    // Deep copy state (simple JSON approach is safest for deep nested arrays, or spread carefully)
    // Since we have nested arrays, map spread is better for performance/cleanliness but let's be verbose to be safe.
    const nextBoards = currentState.boards.map((rowBoards) =>
        rowBoards.map((board) => {
            // Create shallow copy of board
            const newBoard = {
                ...board,
                cells: board.cells.map(row => [...row])
            };
            return newBoard;
        })
    );

    const activePlayer = currentState.activePlayer;
    const targetBoard = nextBoards[mainRow][mainCol];

    // Place mark
    targetBoard.cells[subRow][subCol] = activePlayer;

    // Check for Small Board Win
    const smallWin = check3x3Win(targetBoard.cells);
    if (smallWin) {
        targetBoard.status = smallWin === 'X' ? 'WON_X' : 'WON_O';
    } else if (isGridFull(targetBoard.cells)) {
        targetBoard.status = 'DRAW';
    }

    // Check for Global Win
    // Construct a grid of statuses
    const globalGrid: CellValue[][] = nextBoards.map(row =>
        row.map(b => {
            if (b.status === 'WON_X') return 'X';
            if (b.status === 'WON_O') return 'O';
            return null;
        })
    );

    const globalWin = check3x3Win(globalGrid);
    let gameStatus: Player | 'DRAW' | null = globalWin ? globalWin : null;

    if (!globalWin) {
        // Check global draw (all boards settled)
        const allSettled = nextBoards.every(r => r.every(b => b.status !== 'ACTIVE'));
        if (allSettled) {
            gameStatus = 'DRAW';
        }
    }

    // Determine next active board
    // The next move MUST be in the board corresponding to (subRow, subCol)
    let nextActiveBoard: { row: number; col: number } | null = { row: subRow, col: subCol };

    // If that target board is settled (won/full), then the next player gets a FREE MOVE (null)
    const nextTargetBoard = nextBoards[subRow][subCol];
    if (nextTargetBoard.status !== 'ACTIVE') {
        nextActiveBoard = null;
    }

    // If game is over, active board is null
    if (gameStatus) {
        nextActiveBoard = null;
    }

    return {
        boards: nextBoards,
        activePlayer: activePlayer === 'X' ? 'O' : 'X',
        activeBoard: nextActiveBoard,
        winner: gameStatus,
        history: [...currentState.history] // could push currentState for undo
    };
}
