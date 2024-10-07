

  //TODO? Give chance to change name from direct joining links?
  //noticing: people can't directly join link. Not sure if this logic should stay.
  //TODO? disable ready/start buttons if only host is in room.
  import {  
    createContext,
     useState,
      useEffect,
    } from 'react';
  import {Socket} from 'socket.io-client';
  import io from 'socket.io-client';
  import PickNameModal from './lobby/PickNameModal';
  import JoinedPlayers from './lobby/JoinedPlayersCard';

  import IsNotLegitModal from './lobby/IsNotLegitModal';
  import GameRoomSettingsComponent from './lobby/GameRoomSettingsComponent';//TODO: Add props and events for Rooms on server side and setting adjustments
  import {useNavigate} from 'react-router-dom';
  import "./GameRoom.css";

  //Issue: when this function runs from the disconnect button(I'm assuming at least), it will grab from the rest of the link for subsequent runs?
  const getRoomCode = () => {
    const roomCode = window.location.href;
    let code = '';
    if(roomCode[-1] === '/')
      code = roomCode.slice(-5,-1)
    else
      code = roomCode.slice(-4)
      // return roomCode.slice(-4)
    return code;
  };
//Later: When we get to in game, or maybe before, work on rope logic.
interface PlayersContextType {
    userId: string;
    userName: string;
    rope?: number;//artifact from the client side, not sure if needed or problematic.
    //hopefully rope being optional helps us a bit?
    //never handled yet btw
    //I guess idea to handle it would be if connected but NO mouse movement/action detected
    //tick down until 0, then kick?
    isReady: boolean;

}

interface GameContextValues {
  players: PlayersContextType[];
  setPlayers: React.Dispatch<React.SetStateAction<PlayersContextType[]>>;
  host: string | null;
  setHost: React.Dispatch<React.SetStateAction<string | null>>;
  userId: string | null;
  password: string | null;
  setPassword: React.Dispatch<React.SetStateAction<string|null>>;
  maxPlayers: number;
  setMaxPlayers: React.Dispatch<React.SetStateAction<number>>;//Praying here
  userSocket:Socket;
  roomCode: string;
}
export const GameContext = createContext<GameContextValues | undefined>(undefined);
  const userSocket = io('http://localhost:8080', { autoConnect: false });//I feel like I want autoConnect now, but idk.

  export default function GameRoom() {
    const [userId, setUserId] = useState<string | null>(localStorage.getItem('userId'));//unsure if works as intended
    const [userName,setUserName] = useState<string | null>(localStorage.getItem('userName'))
    const [hasName, setHasName] = useState<boolean>(!!userName);//in a way requires both id and name,
    const [players, setPlayers] = useState<PlayersContextType[]>([]);//Hmmmm. Idk why I didn't get this right before.
    const [isLegitRoom, setIsLegitRoom] = useState(true);//same deal as isFull, but for if room is created yet.
    //Maybe add hard lock for player cap later?
    const [host, setHost] = useState<string | null>(null);
    //TODO: Value for host should prob just be the userId of the host.
    const [password,setPassword] = useState<string | null>(null);
    //TODO: Handle maxPlayers inc dropdown and deck handling (LATER)
    const [maxPlayers,setMaxPlayers] = useState(5);
    const [gameStartCountdown,setGameStartCountdown] = useState(6);//goes down from 5 to 0 then starts game, directs clients to game page
    //TODO still: player rope countdown.
    const roomCode = getRoomCode();
    const navigate = useNavigate();

  useEffect(() => {
    const stuffCheck = async () => {
      if(!userSocket.connected)
        userSocket.connect();//unsure if break here, but should only be happening once.
      if(!userId)
      {
        const newUserId = await userSocket.emitWithAck('generateId');
        localStorage.setItem('userId', newUserId);
        setUserId(newUserId);
      }
    };
    stuffCheck();

  userSocket.on('playerJoin', (playerList:PlayersContextType[]) => {//I think this is an array
    console.log('playerJoin happened: playerList roster', playerList);
    setPlayers(playerList); 
    console.log('Updated Roster: ', players);//players turns out empty...?
  });
  userSocket.on('playerLeave', (userId,roomPlayers:PlayersContextType[],newHost:string) => {
    console.log('playerLeave happened: roomPlayers roster: ', roomPlayers);
    setPlayers(roomPlayers); 
    console.log('Updated Roster: ', players);//players turns out empty...
    setHost(newHost);//Prayge
  });
    return () => {
      userSocket.removeAllListeners();
      //emit userDC event here I guess if ever
    };
  },[])

  useEffect(() => {
    const joinRoom = async () => {
      const userInfo = {
        userId: userId,
        userName:userName
      }
      const roomCode = getRoomCode();
      const joinRoomResponse = await userSocket.emitWithAck('joinRoom',roomCode,userInfo);
      //TODO: grab password from event as well.
      console.log(joinRoomResponse);
      console.log(joinRoomResponse.password)
      if(joinRoomResponse.status === 'join fail')//basically kick.
      {
        setIsLegitRoom(false);//placeholder thing I guess
        console.log('disconnected from trying to join');
        if(userSocket.connected)
          userSocket.disconnect();
      }
      else {
        setPlayers(joinRoomResponse.players);
        setHost(joinRoomResponse.host);
        setPassword(joinRoomResponse.password);
      }
      //should emit back a status for us. NOT YET DONE?
  };
    if(userName != null)
    {
      joinRoom();
      setHasName(true);
    }
  },[userName])

  useEffect(()=>{
    userSocket.on('pwUpdated',(newPassword) => {
      setPassword(newPassword)
    })
    return () => {
      userSocket.off('pwUpdated');
    };
  },[password])

  //Hmmm 
    useEffect(() => {
      userSocket.on('playerReadyToggle',(userId,updatedReadyStatus,countdown) => {
        const updatedPlayers = players.map(p=>p.userId===userId ? 
          {...p,isReady:updatedReadyStatus} : p);
        setPlayers(updatedPlayers);
        setGameStartCountdown(countdown)
      })
      return () => {
        userSocket.off('playerReadyToggle');
      };
    },[players])

    useEffect(()=>{
      userSocket.on('startCountdownUpdate',(countdown)=>{
        console.log(`COUNTDOWN: ${countdown}`)
        setGameStartCountdown(countdown);
      })
      if(gameStartCountdown == 0)//move onto the in-game page
      {
        userSocket.disconnect();
        navigate('/game');
        
      }
      //need to disconnect here.
        
      //TODO? Return statement to shut off the event?
      return () => {
        userSocket.off('countdownUpdate'); // cleanup listener when component unmounts
      };
    },[gameStartCountdown])

    const handleNameSubmit = (name: string) => {
      localStorage.setItem('userName', name);//unsure how much client needs to care about who host is.
      setUserName(name);
      setHasName(true);
    };

    const handleLeave = () => {
      console.log('The room code prior to customDisc', roomCode);
      userSocket.emit('customDisconnect',userId, roomCode);
      navigate(-1);
    }

    return (
      <div>
        {!isLegitRoom && <IsNotLegitModal/>}
        {(hasName == false) && <PickNameModal onNameSubmit={handleNameSubmit} />}
        <div className="preGamePage">
          {gameStartCountdown < 6 && <p>Game will start in ${gameStartCountdown} seconds unless someone cancels.</p> }
          <GameContext.Provider value={{roomCode, players, userId, host, password, maxPlayers,
           setPlayers, setHost, setPassword, setMaxPlayers, userSocket}}>
            <JoinedPlayers/>
            <GameRoomSettingsComponent/>
          </GameContext.Provider>     
          <button onClick={handleLeave}>Disconnect</button>
        </div>
      </div>
    );
  }
