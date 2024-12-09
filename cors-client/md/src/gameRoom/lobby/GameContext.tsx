import React, { createContext, useContext, useState, ReactNode } from 'react';

// Define the shape of the GameContext
interface GameContextType {
    roomCode: string;
    setRoomCode: (code: string) => void;
    players: string[]; // Adjust the type as needed (e.g., Player type)
    setPlayers: (players: string[]) => void;
    host: string;
    setHost: (host: string) => void;
    password: string;
    setPassword: (password: string) => void;
}

const GameContext = createContext<GameContextType | undefined>(undefined);

// Custom hook to use the GameContext
export const useGameContext = (): GameContextType => {
    const context = useContext(GameContext);
    if (!context) {
        throw new Error('useGameContext must be used within a GameProvider');
    }
};

// Provider component
export const GameProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const [roomCode, setRoomCode] = useState<string>('');
    const [players, setPlayers] = useState<string[]>([]);
    const [host, setHost] = useState<string>('');
    const [password, setPassword] = useState<string>('');

    return (
        <GameContext.Provider value={{ roomCode, setRoomCode, players, setPlayers, host, setHost, password, setPassword }}>
            {children}
        </GameContext.Provider>
    );
};
