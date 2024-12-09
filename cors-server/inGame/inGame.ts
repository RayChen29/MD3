import express = require("express");
import { createServer } from "node:http";
import { Server, Socket } from "socket.io"; // Importing Socket from socket.io
import {createDeck,shuffleDeck,drawCard} from './deck'

const app = express();
const server = createServer(app);
const io = new Server(server, {
  cors: {
    origin: "http://localhost:5173",
  },
  connectionStateRecovery: {},
});


// gameEvents.js
module.exports = (io: Server, socket: Socket) => {  // Declaring socket as type Socket

  socket.on('gameConnect',(selfId:string,roomCode:string,ackCallback) => {
    const room = rooms[roomCode];
    if(room)
    {
      const connectedIndex = room.players.findIndex(p=>p.userId === selfId)
      if(!connectedIndex)
      {
        ackCallback({
          connected:false
        });
        socket.disconnect();//I think/hope to kick out unwarranted joiners
      }
        
      room.players[connectedIndex].connected = true;//todo: handle the user disconnect manual -> turn connected false.
      const nrConnected = room.players.filter(p=>p.connected === true).length;//need fix? idk
      ackCallback({
        connected:true,
        nrConnected:nrConnected,
        players: room.players,
      });
      socket.to(roomCode).emit('otherConnected',nrConnected);//todo? might need to handle disconnects, manual/auto cases
      if(nrConnected == room.players.length)//do all the gameJoin stuff, then emit it to the clients.
      {
        //how to officially start the game in the clients' eyes?
        const turnOrder = rollTurnOrder(roomCode);
        startGame(roomCode);//initialize deck and deal hands to players, then emit deck and all hands to all players.
        //One by one, for each player id, emit their fields to all other players. Maybe not keep limits but re-emit all cards each time I guess.
        for(const playerId in room)
            io.to(roomCode).emit('playerHandUpdate',playerId, room.fields[playerId])//Intent: send to each user the userId being affected, plus their cards

          io.to(roomCode).emit('deckUpdate',room.deck);//emit deck once to everyone
          io.to(roomCode).emit('turnOrder',turnOrder);//emit turn order as well as whose turn it is.

        //idk if needed after all yet
        // io.to(roomCode).emit('gameStart')//maybe with an acknowledge? Or just disable the (nonexistent yet) "wait for others to connect" box
      }
    }
  });
  // Additional socket event handlers can go here?
};

const rollTurnOrder = (roomCode:string):string[] => {//todo? determine disconnected cases
  let turnOrderList = [];
  let playerList = rooms[roomCode].players;    
  for(let i = playerList.length - 1; i >= 0; i--)
    {
      const rng = Math.floor(Math.random()*playerList.length);
      turnOrderList.push(playerList.splice(rng,1));//delete the playerId from the list, while pushing it to turnOrderList
    }
  console.log("Turn order: ", turnOrderList);
  return turnOrderList;
}

const startGame = (roomCode:string) => {//todo: figure out what I want to return from this
  const room = rooms[roomCode];
  //todo
  //maybe if all of them connect, then start shuffling the deck and dealing them. Dealing prob either be animated or already done.
  room.deck = createDeck(Math.ceil(room.players.length / 5));
  room.deck = shuffleDeck(room.deck,room.discard);
  for(let i = 0; i < room.nrConnected; i++)
    drawCard(roomCode,room.players[i].playerId,5);
  console.log(`Hands dealt for ${roomCode}`)
}
  //Maybe make a counter for # of (re?-)connected users
  //todo in that case: either set NrConnected to 0, or remove it altogether.
  //todo? kick users whose userId is not in the given list?

  // console.log(`User ${userId} joined room ${roomCode}`);