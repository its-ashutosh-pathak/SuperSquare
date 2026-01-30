import React from 'react';
import { GameState } from '../engine';
import { SmallBoard } from './SmallBoard';

interface MainBoardProps {
    gameState: GameState;
    onMove: (mainRow: number, mainCol: number, subRow: number, subCol: number) => void;
}

export const MainBoard: React.FC<MainBoardProps> = ({ gameState, onMove }) => {
    const { boards, activeBoard } = gameState;

    return (
        <div className="main-board">
            {boards.map((rowBoards, mainRow) => (
                rowBoards.map((board, mainCol) => {
                    // Check if this board is the active target
                    // If activeBoard is null (Free Move), AND this board is not settled, it IS a valid target.
                    let isActiveTarget = false;

                    if (activeBoard) {
                        isActiveTarget = (activeBoard.row === mainRow && activeBoard.col === mainCol);
                    } else {
                        // Free move mode: Any active board is a target
                        isActiveTarget = (board.status === 'ACTIVE');
                    }

                    if (gameState.winner) isActiveTarget = false;

                    return (
                        <SmallBoard
                            key={`${mainRow}-${mainCol}`}
                            board={board}
                            gameState={gameState}
                            onMove={onMove}
                            isActiveTarget={isActiveTarget}
                        />
                    );
                })
            ))}
        </div>
    );
};
