import { useState, useCallback, useEffect } from 'react';
import { GameState, getInitialState, makeMove as engineMakeMove } from '../engine';

export function useGame() {
    const [gameState, setGameState] = useState<GameState>(getInitialState());
    const [timeLeft, setTimeLeft] = useState(60);
    const [hasStarted, setHasStarted] = useState(false);

    // Timer Logic
    useEffect(() => {
        if (gameState.winner || !hasStarted) return;

        const timerId = setInterval(() => {
            setTimeLeft((prev) => {
                if (prev <= 1) {
                    clearInterval(timerId);
                    // Handle Timeout
                    setGameState(gs => ({
                        ...gs,
                        winner: gs.activePlayer === 'X' ? 'O' : 'X', // Opponent wins
                        activeBoard: null // Lock board
                    }));
                    return 0;
                }
                return prev - 1;
            });
        }, 1000);

        return () => clearInterval(timerId);
    }, [gameState.winner, gameState.activePlayer, hasStarted]);

    const resetGame = useCallback(() => {
        setGameState(getInitialState());
        setTimeLeft(60);
        setHasStarted(false);
    }, []);

    const makeMove = useCallback((mainRow: number, mainCol: number, subRow: number, subCol: number) => {
        // Validation needs current state
        try {
            const newState = engineMakeMove(gameState, mainRow, mainCol, subRow, subCol);

            setGameState(newState);
            setTimeLeft(60);
            if (!hasStarted) setHasStarted(true);

        } catch (e) {
            console.error("Invalid move:", e);
        }
    }, [gameState, hasStarted]);

    return {
        gameState,
        makeMove,
        resetGame,
        timeLeft
    };
}
