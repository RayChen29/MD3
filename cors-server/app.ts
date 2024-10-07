//TODO: Make joinroom navigate people properly. Probably entails hopping into the client.
//TODO: Add the periodic room check, make sure empty rooms don't exist too long.
//TODO: handle host properties on both client and server sides

//TODO? Try to split events into ingame vs pregame for readability sake.
//TODO: Make ingame events

//Lobby events are on this file.
import express = require("express");
import { createServer } from "node:http";
import { Server } from "socket.io";
import {createDeck, shuffleDeck} from "./inGame/deck";
// import '.inGame/inGame.ts';
// import * from `./inGame/inGame`;
// import * from './inGame/deck';
const app = express();
const server = createServer(app);
const io = new Server(server, {
  cors: {
    origin: "http://localhost:5173",
  },
  connectionStateRecovery: {},
});


//TODO: maybe migrate players' rope prop elsewhere? But then again makes half sense either way..
const gameEvents = require('./inGame/inGame')

interface Card {
  name:string;
  type:string; //Action, Property, Money, Reactive
  colors?:string[];//what colors are this card applicable to?
  //tbh not how to to smoothly implement colors or houses/hotels
  currentColor?:number;//should probably be empty at first, but number prob determine what color it is at the moment?
  value:number;
  quantity:number;
  //inSet flag? idk

  // methods?:
}

//todo: create fields: properties/sets, money, hand
//TODO: Handle the player d/c / afk too long case.
interface Field {
  hand:Card[];
  money:Card[];
  //need a smoother way to handle properties.
  props:Card[];
}

interface Player {
  userId: string;
  userName: string;
  rope: number;//How to modify this number over time?
  //Unsure if this can pull through
  isReady:boolean;
  //in game
  
}

interface Room {
  [key: string]: {
    inGame: boolean;
    players: Player[];//keep track of players in the room
    password?: string;
    host: string;//host's userId
    countdown:number; //when hits 0, game starts
    timeTicking:boolean; //is time ticking or not?

    //todo: max length allowed. 5 for now, but need to account later
    maxPlayers: number;

    //in-game stuff
    deck:Card[];//
    discard:Card[];
    fields:Record<string,Field>//Each player's boards; need to dynamic adjust for number of players.

  };
}

interface UserRoomList{ //Hold many userId's, which hold one roomCode (the 2nd string) each.
  [userId:string]: string
}

interface SubmitInfo {
  userId: string;
  userName: string;
  password?: string;
  roomCode: string;
}
//Might need to migrate userIDs to the UserRoomList
let userIDs: string[] = [];
const rooms: Room = {};
const defaultRoomCap = 5;
const ROPE_CONST = 2;

let userRoomMap: UserRoomList = {};

const createPlayer = (userId:string,userName:string): Player => ({
  userId,
  userName,
  rope:0,
  isReady:false,
})
//prayge

//refactor this for the new format, or just take the specifics from the submitted info?
//TODO?: on sufficient disconnect time / game end / afk time, unbind userId from room code


const playerJoinRoom = (
  roomId: string,
  userInfo: Player,
  password?: string,//idk if this even needs ot be questioned.
  roomMax?: number,
): [boolean,boolean] => {//Were you able to join room? Did you need to join room beforehand?
  let room = rooms[roomId];
  if (!userInfo || !userInfo.userId || !userInfo.userName) {
    console.error('Invalid userInfo:', userInfo); //Multiple calls made (2 of them), this fail case happens twice.
    return [false, false];
  }

  const roomPw = password ? password : "";
  roomMax = roomMax ? roomMax : defaultRoomCap
  // if(!password)
  if (!room || room.players.length === 0) {
    // Room doesn't exist, create a new one
    rooms[roomId] = {
      inGame: false,
      players: [userInfo],
      host: userInfo.userId,
      maxPlayers: roomMax,
      password: roomPw,
      countdown: 6,
      timeTicking: false,
      deck: [], // Initialize the deck here
      discard: [], // Initialize discard pile here
      fields: {
        [userInfo.userId]: {
          hand: [],
          money: [],
          props: [],
        }, // Dynamically create fields for the user
      },
    };
    userRoomMap[userInfo.userId] = roomId;//artifact? idk
    console.log("JOINED PLAYERS NEW ROOM", rooms[roomId].players);
    return [true,true];
  } 
else {//room exists
  if (!room.players || room.players.length == 0) {//need to initialize room's players.
    // const newPlayer = createPlayer(userInfo.userId, userInfo.userName);
    rooms[roomId] = {
      inGame: false,
      players: [userInfo],
      host: userInfo.userId,
      maxPlayers: roomMax,
      countdown:6,
      timeTicking:false,
      //in game stuff/initialization?
      //fields:
      deck: [], // Initialize the deck here
      discard: [], // Initialize discard pile here
      fields: {
        [userInfo.userId]: {
          hand: [],
          money: [],
          props: [],
        }, // Dynamically create fields for the user
      },
    };
    console.log("Room exists, but was empty. Player joined room");
    } 
    else {
      if (!userInfo) {//how was it slipping through to begin with?
        console.log('userInfo is undefined');
        return [false, false];
      }
//unsure if this case is useful now or later.

      // const existingPlayer = room.players.findIndex(p => p.userId == userInfo.userId);//this is just a number, right?
      // if (existingPlayer !== -1) {//If found, change name on file to client's new declared name.
      //TBH IDK if this even changes anything.
      const existingPlayer = room.players.find(p => p.userId == userInfo.userId);
      if(existingPlayer)
      {
        // console.log('name before: ', rooms[roomId]?.players[existingPlayer]?.userName);
        console.log('name before: ', existingPlayer.userName);
        existingPlayer.userName = userInfo.userName
        console.log('name after: ', existingPlayer.userName);

        return [true, false];
      }

      //password exists and guessed wrong.
      if (room.password && password !== room.password) return [false, false];
      //No free slots for new joiners.
      if (room.players.length >= room.maxPlayers) return [false, false];
       //if all conditions true, get them in.
       console.log('player was not here yet, so create');
      if(rooms[roomId])
      {
        rooms[roomId].players = [...rooms[roomId].players,userInfo];
        rooms[roomId].fields[userInfo.userId] = {
          hand:[],
          money:[],
          props:[],
        }
      }
        
    }

    console.log("JOINED PLAYERS", rooms[roomId]?.players);
    userRoomMap[userInfo.userId] = roomId;
    //in any case, bind
    console.log("playerjoinroom END");
    return [true,true];
  };
};
setInterval(() => {
  //crappy workaround for unreadying host included
  for(const roomCode in rooms){
    const room = rooms[roomCode];
    if(room && room.players)
    {
      const hostIndex = room.players.findIndex(p=>p.userId==room.host);
      if(hostIndex >= 0 && room.players[hostIndex]!.isReady == true)//Force host's ready status to false, reset countdown if this happens (idk how much this impacts)
      // const hostId = room.host;
        //prayge
      {
        room.players[hostIndex]!.isReady = false;//
        const hostId = room.host;
        io.to(roomCode).emit('playerReadyToggle',hostId,false,6);
      }
    }
    if(room?.timeTicking == true && room.countdown > 0) //tick the countdown 1 second
    {
      const countdown = room.countdown -= 1 
      //ISSUE: When someone unreadies, the countdown resets, but does not stop ticking.
    
      console.log(`countdown be like: ${countdown}`)
      io.to(roomCode).emit('startCountdownUpdate',(countdown));//Do we need to send any additional data?
      if(countdown == 0 && room.inGame == false)
      {
        room.inGame = true;
        //figure out proper number of decks to shuffle together, etc.+
        const nrDecks:number = Math.ceil(room.players.length / 5)
        room.deck = createDeck(nrDecks);//todo: how to properly import?
        room.deck = shuffleDeck(room.deck);
      }
        
      //TODO? Identify conditions to make inGame false, prob involving after the game concludes.
    }
            //Prayging for above to work out.
  }
 }, 1000);

io.on("connection", (socket) => {

  console.log("a user connected");

  socket.on("customDisconnect", (userId, roomCode) => {
    console.log('disconnector: ', userId, roomCode); //Ah. Room Code gets undefined.
    const room = rooms[roomCode];
    if(room){
    // if (room && room.players) {
      const roomPlayers = room.players;
      if (roomPlayers.length >= 1 && roomPlayers.find(p => p.userId === userId) != undefined) {
        const newRoomRoster = roomPlayers.filter(p => p.userId != userId);
        room.players = newRoomRoster;

        //if room is still has players?
        // const newHost = newRoomRoster[0]?.userId;//need to try old designation
        const newHost = room.players[0]?.userId;
        if(newHost && newHost != userId)
        {
          room.host = newHost;
          //I think should unready to stamp out potential issues
          if(room.players[0]?.isReady)
            room.players[0].isReady = false;
        }
        //if the leaver was the host, switch permissions.
          console.log('newRoomRoster: ', newRoomRoster);
          socket.to(roomCode).emit('playerLeave',userId,newRoomRoster,newHost);//I think?
         }
    } 
  });

    //any reason so far dc is
  socket.on("disconnect", () => {console.log("user disconnected");});

  //Creates a userId for the client('s browser)
  socket.on("generateId", (ackCallback) => {
    let userId = "";
    let isIdTaken = false;
    const charaPool = "qwertyuiopasdfghjklzxcvbnm1234567890";
    do {
      let maybeId = "";
      for (let i = 0; i < 6; i++) {
        maybeId += charaPool[Math.floor(Math.random() * charaPool.length)];
      }
      isIdTaken = userIDs.includes(maybeId);
      if (!isIdTaken) userId = maybeId;
    } while (isIdTaken);
    userIDs.push(userId);
    ackCallback({ userId });
    console.log("Generated userId:", userId); // Add this line
  });

  //Need to make this less confusing.
  socket.on("isRoomMade", (roomCode, ackCallback) => {
    const room = rooms[roomCode];
    if (!room) ackCallback(false);
    ackCallback(true);
  });
  //TODO: even when hosting room, roomCode ends up undefined, probably when grabbing it from the emitted event.
  socket.on("hostRoom", (submitInfo) => {
    const { userId, userName, password, roomCode } = submitInfo;
    const hostPlayer = createPlayer(userId,userName);
    console.log("hostRoom ", userId, userName, password, roomCode);
    playerJoinRoom(roomCode, hostPlayer, password,defaultRoomCap);//TODO: defaultRoomCap is a placeholder(I think for now)
    socket.emit("redirectToLobby", { ...submitInfo });
  });

  //This event should be for entering the link;
  //Need to make a separate event for joining the game within that room.
  //TODO: Room is undefined if joined without creating first

  //TODO: make a enter room link event, and split that from joining the game room.
  socket.on('enterLink',(submitInfo,ackCallback) => {
    const { userId, userName, password, roomCode } = submitInfo;
    console.log("ENTER LINK: ",userId, userName, password, roomCode);
    const userInfo = createPlayer(userId,userName);//maybe offending?
    if (!ackCallback || typeof ackCallback !== 'function') { // Added: Ensure ackCallback is a function
      console.error("ackCallback is not provided or not a function");
      return;
    }
    const joinResult = playerJoinRoom(roomCode, userInfo,password);
    console.log("joinResult: ",joinResult);
    let status;
    if(joinResult[0] === false)
      status = 'failed';//user fails, but gets navigated anyways. huh?
    else 
      status = (joinResult[1] == true ? 'player joined' : 'player already joined, no further action taken');
    if(joinResult[1] === true)//not sure how much this inefficiency matters
      userRoomMap[userId] = roomCode;//maybe?
    console.log('enterlink status: ',status);
    ackCallback({
      status:status,
      ...submitInfo,//hopefully this spreads the data for use
    })
    //TODO? Maybe unbind userId's from rooms if they join another one sucessfully? Apply this to Hosts too.
  });

//MIGHT NEED TO OVERHAUL THE JOINING PROCESS ON SERVER SIDE.
//REMINDER: Players enter the link and join the room in the same command.
//joinRoom should prob just be a check for if they went through the process, NOT to join again.

socket.on('joinRoom', (roomCode, userInfo, ackCallback) => {
  let players;
  let status;
  
  if (userRoomMap[userInfo.userId] === roomCode) {
    players = rooms[roomCode]?.players || []; // Ensure players is an array
    status = 'authenticated';
  } else {
    status = 'join fail';
  }
  
  socket.join(roomCode);

  // Emit the full player list
  const playerList = rooms[roomCode]?.players || [];
  socket.to(roomCode).emit('playerJoin', playerList); // Emit the array of players

  ackCallback({
    status: status,
    players: players,
    host: rooms[roomCode]?.host,
    password: rooms[roomCode]?.password,
  });
});

socket.on('updatePW',(roomCode,userId,newPassword,ackCallback)=> {
  const room = rooms[roomCode];
  if(room && room.host === userId)
  {
      room.password = newPassword;
      ackCallback({status: true,})
      socket.to(roomCode).emit('pwUpdated',newPassword);
  }
  ackCallback({status:false,})
});

socket.on('toggleReady',(roomCode,userId,ackCallback) => {
   const room = rooms[roomCode];
   if(room && room.players)
   {
    const userIndex = room.players.findIndex(p=>p.userId==userId)
    if(userIndex >= 0)//do we ever send back a negatory status?
    {
      const targetPlayer = room.players[userIndex];
      if(targetPlayer)
      {
      //If this is done during the game start countdown, reset the countdown, maybe send the countdown over to the clients too?
        if(room.countdown < 6)
          room.countdown = 6;
        const countdown = room.countdown
        const updatedReadyStatus = targetPlayer.isReady = !targetPlayer.isReady;
        ackCallback({status:true})
        //hopefully this sends it to the original calling client too
        socket.emit('playerReadyToggle',userId,updatedReadyStatus,countdown)
        socket.to(roomCode).emit('playerReadyToggle',userId,updatedReadyStatus,countdown);
      }

    }
   }


   

// socket.on
 
});
//How to reference rooms.
//TODO: move the host transferral implementation to here.

socket.on('gameStartCountdown',(roomCode) => {
  console.log('caught gameStartCountdown');
    const room = rooms[roomCode];
    if(room)
      room.timeTicking = true;
    socket.to(roomCode).emit('startCountdownUpdate',(room?.countdown));
 })
//TODO: Clear interval / set countdown to 6 when the appropriate reason comes up.


 gameEvents(io,socket);
});

server.listen(8080, () => {
  console.log("listening on port 8080");
});
