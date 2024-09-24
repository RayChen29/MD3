import React, { useContext } from 'react';
// import { PlayersContext } from '../GameRoom'; // Adjust path if necessary
import {GameContext} from '../GameRoom';
import './JoinedPlayersCard.css';

const JoinedPlayers: React.FC = () => {

  const game = useContext(GameContext);
  if (!game) {
    throw new Error("GameContext must be used within a GameContext.Provider");
  }
  const { players, host, userId }= game;

//  Log the type and value of players
  console.log('Players context:', players);
  console.log('Type of players:', typeof players);
  console.log('host context', host);//is null atm

  if (players === null) {
    return <div>Error: Players context is null.</div>;
  }

  if (!Array.isArray(players)) {
    return <div>Error: Players context is not an array. Type is {typeof players}.</div>;
  }

  // if (players.length === 0) {
  //   return <div>No players in the room.</div>;
  // }
    

  return (
    <div className="playersList">
      {players.map(player => (
        <div key={player.userId}>
          {/* <p>UserId: {player.userId}</p> */}
          {player.userId == host && <p className="hostName"> {player.userName} {player.userId == userId && "(YOU)"} </p>}
          {player.userId != host && <p>{player.isReady && '✅'}{player.userName} {player.userId == userId && "(YOU)"}</p>}
          {/* <p>UserName: {player.userName}</p> */}
        </div>
      ))}
    </div>
  );
};

export default JoinedPlayers;
