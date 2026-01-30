import React from 'react';
import { SmallBoard as SmallBoardType, isValidMove, GameState } from '../engine';
import { Cell } from './Cell';

interface SmallBoardProps {
    board: SmallBoardType;
    gameState: GameState;
    onMove: (mainRow: number, mainCol: number, subRow: number, subCol: number) => void;
    isActiveTarget: boolean; // If this board is the current target
}

export const SmallBoard: React.FC<SmallBoardProps> = ({ board, gameState, onMove, isActiveTarget }) => {
    const { row: mainRow, col: mainCol, cells, status } = board;

    const isComplete = status !== 'ACTIVE';

    return (
        <div className={`small-board ${isActiveTarget ? 'small-board--active' : ''} ${isComplete ? `small-board--${status}` : ''}`}>
            <div className="small-board-grid">
                {cells.map((row, subRow) => (
                    row.map((cellValue, subCol) => {
                        // Determine if this specific cell is playable
                        const playable = !gameState.winner &&
                            !isComplete &&
                            isValidMove(gameState, mainRow, mainCol, subRow, subCol);

                        return (
                            <Cell
                                key={`${subRow}-${subCol}`}
                                value={cellValue}
                                onClick={() => onMove(mainRow, mainCol, subRow, subCol)}
                                isPlayable={playable}
                                isValidTarget={playable} // redundant but kept for clarity
                            />
                        );
                    })
                ))}
            </div>
            {/* Overlay for won/drawn boards */}
            {isComplete && (
                <div className="small-board-overlay">
                    {status === 'WON_X' && 'X'}
                    {status === 'WON_O' && 'O'}
                    {status === 'DRAW' && '-'}
                </div>
            )}
        </div>
    );
};
