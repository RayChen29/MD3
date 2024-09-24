

  //TODO? Give chance to change name from direct joining links?
  //noticing: people can't directly join link. Not sure if this logic should stay.
  //TODO: disable ready/start buttons if only host is in room.
  import {  
    createContext,
    //  useContext,
     useState,
      useEffect,
      // ReactNode
    } from 'react';
  // import {Socket},io from 'socket.io-client';
  import {Socket} from 'socket.io-client';
  import io from 'socket.io-client';
  import PickNameModal from './lobby/PickNameModal';
  import JoinedPlayers from './lobby/JoinedPlayersCard';
  // import IsFullModal from './lobby/IsFullModal';
  import IsNotLegitModal from './lobby/IsNotLegitModal';
  import GameRoomSettingsComponent from './lobby/GameRoomSettingsComponent';//TODO: Add props and events for Rooms on server side and setting adjustments
  import {useNavigate} from 'react-router-dom';
  import "./GameRoom.css";

  //Issue: when this function runs from the disconnect button(I'm assuming at least), it will grab from the rest of the link for subsequent runs.
  const getRoomCode = () => {//used for room size check prior to entering. If wanted more secure, would do toher stuff?
    const roomCode = window.location.href;
    let code = '';
    if(roomCode[-1] === '/')
      code = roomCode.slice(-5,-1)
      // return roomCode.slice(-5,-1)//I think I got it.
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
  //hoping
  // isHost: boolean;
  // setIsHost: React.Dispatch<React.SetStateAction<PlayersContextType[]>>;
  //Maybe add setIsHost?
  userId: string | null;
  password: string | null;
  setPassword: React.Dispatch<React.SetStateAction<string|null>>;
  maxPlayers: number;
  setMaxPlayers: React.Dispatch<React.SetStateAction<number>>;//Praying here
  userSocket:Socket;
  roomCode: string;
}
//Unsure if want to keep PlayersContext, provided the advent of GameContext works out.
// export const PlayersContext = createContext<PlayersContextType[] | null>(null);//Unsure if keep this if we going to next step.
export const GameContext = createContext<GameContextValues | undefined>(undefined);

//TODO: Make context for IsHost, and whether or not they can change settings.

  const userSocket = io('http://localhost:8080', { autoConnect: false });//I feel like I want autoConnect now, but idk.

  export default function GameRoom() {
    const [userId, setUserId] = useState<string | null>(localStorage.getItem('userId'));//unsure if works as intended
    const [userName,setUserName] = useState<string | null>(localStorage.getItem('userName'))
    const [hasName, setHasName] = useState<boolean>(!!userName);//in a way requires both id and name,
    const [players, setPlayers] = useState<PlayersContextType[]>([]);//Hmmmm. Idk why I didn't get this right before.
    const [isLegitRoom, setIsLegitRoom] = useState(true);//same deal as isFull, but for if room is created yet.
    //Maybe add hard lock for player cap later?
    // const [isHost, setIsHost] = useState(false);//host gets to adjust properties of a game room, inc. passwords, max no. of players, and starting game on majority?
    const [host, setHost] = useState<string | null>(null);
    //TODO: Value for host should prob just be the userId of the host.
    //TODO: implement state for passwords.
    const [password,setPassword] = useState<string | null>(null);
    //TODO: Handle maxPlayers
    const [maxPlayers,setMaxPlayers] = useState(5);
    const [gameStartCountdown,setGameStartCountdown] = useState(6);//goes down from 5 to 0 then starts game, swaps out lobby components for game components.
    //countdown going to be dependent on the server though.
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
  // userSocket.on('playerLeave', (userId,roomPlayers:PlayersContextType[]) => {//hopefully same thing as playerJoin
  userSocket.on('playerLeave', (userId,roomPlayers:PlayersContextType[],newHost:string) => {
    console.log('playerLeave happened: roomPlayers roster: ', roomPlayers);
    setPlayers(roomPlayers); 
    console.log('Updated Roster: ', players);//players turns out empty...
    setHost(newHost);//Prayge
    // if(newHost === userId)
    //   setIsHost(true);//TODO: make Game Room Settings Component.
  });
    return () => {
      // const roomCode = getRoomCode();//this becomes undefined when sending to server.
      userSocket.removeAllListeners();
      //emit userDC event here I guess
    };
  },[])

  useEffect(() => {
//define connecting function here maybe? Wouldn't like to but seems like no choice b/c IDE ...
    const joinRoom = async () => {
      //since players are made in the join/host rooms, are undefineds being created here?

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
      // joinRoom();
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
      //Would this even trigger?
      userSocket.on('playerReadyToggle',(userId,updatedReadyStatus,countdown) => {
        const updatedPlayers = players.map(p=>p.userId===userId ? 
          {...p,isReady:updatedReadyStatus} : p);
        setPlayers(updatedPlayers);
        setGameStartCountdown(countdown)
      })
      return () => {
        // const roomCode = getRoomCode();//this becomes undefined when sending to server.
        userSocket.off('playerReadyToggle');//hope?
        //emit userDC event here I guess
      };
    },[players])

    useEffect(()=>{
      userSocket.on('startCountdownUpdate',(countdown)=>{
        console.log(`COUNTDOWN: ${countdown}`)
        setGameStartCountdown(countdown);
      })
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
//error to others after leaving: Players context is not an array, type is string.
    const handleLeave = () => {
      console.log('The room code prior to customDisc', roomCode);
      userSocket.emit('customDisconnect',userId, roomCode);
      navigate(-1);
    }

//TODO: Add a countdown
//TODO?: add a condition for the gameStartCountdown appearing
    return (
      <div>
        {!isLegitRoom && <IsNotLegitModal/>}
        {(hasName == false) && <PickNameModal onNameSubmit={handleNameSubmit} />}
        <div className="preGamePage">
          {gameStartCountdown == 6 && <p>GAME NO START YET</p>}
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
