import express = require("express");
import { createServer } from "node:http";
import { Server } from "socket.io";

const app = express();
const server = createServer(app);
const io = new Server(server, {
  cors: {
    origin: "http://localhost:5173",
  },
  connectionStateRecovery: {},
});

//todo: What if two people end up with the same userID later on?
//todo: re-assign another id to the later person probably.

const addDeck = (roomCode:string) => {
    
}
  
// gameEvents.js
module.exports = (io:Server, socket) => {
  socket.on('gameJoin', (userId:string, roomCode:string) => {
      // Handle gameJoin event
      console.log(`User ${userId} joined room ${roomCode}`);
      // Further logic for game joining, if any.
  });



//draw 5 for all players here?

  // You can add more socket event handlers here
};
