import { createContext, useState, useEffect, useContext } from 'react';
import { Socket } from 'socket.io-client';
import io from 'socket.io-client';
import PickNameModal from './lobby/PickNameModal';
import JoinedPlayers from './lobby/JoinedPlayersCard';
import IsNotLegitModal from './lobby/IsNotLegitModal';
import GameRoomSettingsComponent from './lobby/GameRoomSettingsComponent';
import { useNavigate } from 'react-router-dom';
import './GameRoom.css';

// Interface for PlayersContextType
interface PlayersContextType {
  userId: string;
  userName: string;
  rope?: number; // Optional field for future handling
  isReady: boolean;
}

// Interface for GameContextValues
interface GameContextValues {
  players: PlayersContextType[];
  setPlayers: React.Dispatch<React.SetStateAction<PlayersContextType[]>>;
  host: string | null;
  setHost: React.Dispatch<React.SetStateAction<string | null>>;
  userId: string | null;
  password: string | null;
  setPassword: React.Dispatch<React.SetStateAction<string | null>>;
  maxPlayers: number;
  setMaxPlayers: React.Dispatch<React.SetStateAction<number>>;
  userSocket: Socket;
  roomCode: string;
}

// GameContext for the application
export const GameContext = createContext<GameContextValues | undefined>(undefined);

// Initialize socket connection
const userSocket = io('http://localhost:8080', { autoConnect: false });

export default function GameRoom() {
  const [userId, setUserId] = useState<string | null>(localStorage.getItem('userId'));
  const [userName, setUserName] = useState<string | null>(localStorage.getItem('userName'));
  const [hasName, setHasName] = useState<boolean>(!!userName);
  const [players, setPlayers] = useState<PlayersContextType[]>([]);
  const [isLegitRoom, setIsLegitRoom] = useState(true);
  const [host, setHost] = useState<string | null>(null);
  const [password, setPassword] = useState<string | null>(null);
  const [maxPlayers, setMaxPlayers] = useState(5);
  const [gameStartCountdown, setGameStartCountdown] = useState(6);
  const roomCode = getRoomCode(); // Custom function to get room code from URL
  const navigate = useNavigate();

  // Function to extract room code from URL
  function getRoomCode() {
    const roomCode = window.location.href;
    let code = '';
    if (roomCode.slice(-1) === '/') {
      code = roomCode.slice(-5, -1);
    } else {
      code = roomCode.slice(-4);
    }
    return code;
  }

  // useEffect to handle socket connection and user ID generation
  useEffect(() => {
    const initializeSocket = async () => {
      if (!userSocket.connected) userSocket.connect();

      if (!userId) {
        const newUserId = await userSocket.emitWithAck('generateId');
        localStorage.setItem('userId', newUserId);
        setUserId(newUserId);
      }
    };
    initializeSocket();

    userSocket.on('playerJoin', (playerList: PlayersContextType[]) => {
      setPlayers(playerList);
    });

    userSocket.on('playerLeave', (userId, roomPlayers: PlayersContextType[], newHost: string) => {
      setPlayers(roomPlayers);
      setHost(newHost);
    });

    return () => {
      userSocket.removeAllListeners();
    };
  }, []);

  // useEffect to handle joining a room
  useEffect(() => {
    const joinRoom = async () => {
      const userInfo = {
        userId,
        userName,
      };
      const joinRoomResponse = await userSocket.emitWithAck('joinRoom', roomCode, userInfo);

      if (joinRoomResponse.status === 'join fail') {
        setIsLegitRoom(false);
        userSocket.disconnect();
      } else {
        setPlayers(joinRoomResponse.players);
        setHost(joinRoomResponse.host);
        setPassword(joinRoomResponse.password);
      }
    };

    if (userName) {
      joinRoom();
      setHasName(true);
    }
  }, [userName]);

  // useEffect to listen for password updates
  useEffect(() => {
    userSocket.on('pwUpdated', (newPassword) => {
      setPassword(newPassword);
    });

    return () => {
      userSocket.off('pwUpdated');
    };
  }, [password]);

  // useEffect to handle player ready toggle and countdown updates
  useEffect(() => {
    userSocket.on('playerReadyToggle', (userId, updatedReadyStatus, countdown) => {
      const updatedPlayers = players.map((p) =>
        p.userId === userId ? { ...p, isReady: updatedReadyStatus } : p
      );
      setPlayers(updatedPlayers);
      setGameStartCountdown(countdown);
    });

    return () => {
      userSocket.off('playerReadyToggle');
    };
  }, [players]);

  // useEffect to handle game start countdown
  useEffect(() => {
    userSocket.on('startCountdownUpdate', (countdown) => {
      setGameStartCountdown(countdown);
    });

    if (gameStartCountdown === 0) {
      userSocket.disconnect();
      navigate('/game');
    }

    return () => {
      userSocket.off('startCountdownUpdate');
    };
  }, [gameStartCountdown]);

  // Handle name submission
  const handleNameSubmit = (name: string) => {
    localStorage.setItem('userName', name);
    setUserName(name);
    setHasName(true);
  };

  // Handle leave room event
  const handleLeave = () => {
    userSocket.emit('customDisconnect', userId, roomCode);
    navigate(-1);
  };

  return (
    <div>
      {!isLegitRoom && <IsNotLegitModal />}
      {!hasName && <PickNameModal onNameSubmit={handleNameSubmit} />}
      <div className="preGamePage">
        {gameStartCountdown < 6 && <p>Game will start in {gameStartCountdown} seconds unless someone cancels.</p>}
        <GameContext.Provider
          value={{
            roomCode,
            players,
            userId,
            host,
            password,
            maxPlayers,
            setPlayers,
            setHost,
            setPassword,
            setMaxPlayers,
            userSocket,
          }}
        >
          <JoinedPlayers />
          <GameRoomSettingsComponent />
        </GameContext.Provider>
        <button onClick={handleLeave}>Disconnect</button>
      </div>
    </div>
  );
}
