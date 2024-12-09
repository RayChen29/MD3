import React, { createContext, useContext, useState, ReactNode } from 'react';

// Define the shape of the PlayerContext
interface PlayerContextType {
    playerList: string[]; // Adjust the type as needed (e.g., Player type)
    setPlayerList: (players: string[]) => void;
    isReady: boolean;
    setIsReady: (ready: boolean) => void;
}

const PlayerContext = createContext<PlayerContextType | undefined>(undefined);

// Custom hook to use the PlayerContext
export const usePlayerContext = (): PlayerContextType => {
    const context = useContext(PlayerContext);
    if (!context) {
        throw new Error('usePlayerContext must be used within a PlayerProvider');
    }
};

// Provider component
export const PlayerProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const [playerList, setPlayerList] = useState<string[]>([]);
    const [isReady, setIsReady] = useState<boolean>(false);

    return (
        <PlayerContext.Provider value={{ playerList, setPlayerList, isReady, setIsReady }}>
            {children}
        </PlayerContext.Provider>
    );
};
