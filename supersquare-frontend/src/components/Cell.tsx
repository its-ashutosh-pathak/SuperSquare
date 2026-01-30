import React from 'react';
import { CellValue } from '../engine';

interface CellProps {
    value: CellValue;
    onClick: () => void;
    isPlayable: boolean;
    isValidTarget: boolean; // Just for hover effects, optional
}

export const Cell: React.FC<CellProps> = ({ value, onClick, isPlayable }) => {
    return (
        <button
            className={`cell ${value ? `cell--${value}` : ''} ${isPlayable ? 'cell--playable' : ''}`}
            onClick={onClick}
            disabled={!isPlayable}
        >
            {value}
        </button>
    );
};
