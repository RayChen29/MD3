//TODO: Make joinroom navigate people properly. Probably entails hopping into the client.
//TODO: handle host properties on both client and server sides
//TODO: Make ingame events

//Lobby events are on this file.
import express = require("express");
import { createServer } from "node:http";
import { Server } from "socket.io";
import {createDeck, shuffleDeck,CardDatabase} from "./inGame/deck";
const app = express();
const server = createServer(app);
const io = new Server(server, {
  cors: {
    origin: "http://localhost:5173",
  },
  connectionStateRecovery: {},
});
//todo?: implement player ropes to begin w
//TODO: maybe migrate players' rope prop elsewhere? But then again makes half sense either way..
const gameEvents = require('./inGame/inGame')
//todo: For every method/event/whatever involving properties, 
//need to account for currentColor/wildcards as well
interface Card {
  name:string;
  type:string; //Action, Property, Money, Reactive
  colors?:string[];//what colors are this card applicable to?
  //tbh not how to to smoothly implement colors or houses/hotels
  currentColor?:number;//should probably be empty at first, but number prob determine what color it is at the moment?
  value:number;
  quantity:number;
  //inSet flag? idk
  inSet?:boolean;
  // methods?:
}

interface Set {
  cards:Card[];
  isFullSet:boolean;
  //maybe want to add color here? Can try that for now
  color:string;
}

//TODO: Handle the player d/c / afk too long cases.
interface Field {
  hand:Card[];
  money:Card[];
  props:Set[];//todo? might need a way to represent an empty set/place to make new sets from, or otherwise handle that case.
}

interface Player {
  userId: string;
  userName: string;
  rope: number;//How to modify this number over time?
  //Unsure if this can pull through
  isReady:boolean;
  //in game
  connected?:boolean;
  actions:number;//forgot if set.
  turnPlayer?:boolean;
  wasAFK?:boolean;

}

interface Room {
  [key: string]: {
    inGame: boolean;
    players: Player[];//keep track of players in the room
    password?: string;
    host: string;//host's userId
    afkCountdown:number;
    //game start 
    countdown:number; //when hits 0, game starts
    timeTicking:boolean; //is time ticking or not?

    //todo: max length allowed. 5 for now, but need to account for future adjustability later
    maxPlayers: number;

    //in-game stuff
    deck:Card[];//
    discard:Card[];
    fields:Record<string,Field>//Each player's boards; hand and field(money/props)
    turnList?:string[];
    turnPlayer:number;//forgot if handled; if not, todo: handle turn player stuff
    turnCountdown:number; //If reaches 0, skips player's turn
    actionTaken?:boolean;
    inGameTimer?:number;
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
  connected:false,
  actions:3,
  // sets:0,
  turnPlayer:false,
})
//prayge

//refactor this for the new format, or just take the specifics from the submitted info?
//TODO?: on sufficient disconnect time / game end / afk time, unbind userId from room code

const playerJoinRoom = (
  roomId: string,
  userInfo: Player,
  password?: string,//idk if this even needs ot be questioned.
  roomMax?: number,
): [boolean,boolean] => {
  //Were you able to join room? Did you need to join room beforehand?
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
      afkCountdown:6,
      countdown: 6,
      timeTicking: false,
      deck: [], // Initialize the deck here
      discard: [], // Initialize discard pile here
      turnPlayer:0,
      fields:{},
      turnCountdown:180_000,//3 minutes
    };
    rooms[roomId].fields[userInfo.userId] = {
      hand:[],
      money:[],
      props:[
        {//intent: an empty array/set
          cards:[],
          isFullSet:false,
          color:''
        }
      ],
    };
    console.log("Field check", rooms[roomId].fields);
    userRoomMap[userInfo.userId] = roomId;//artifact? idk
    console.log("JOINED PLAYERS NEW ROOM", rooms[roomId].players);
    return [true,true];
  } 
  else { // Room exists
    if (!room.players || room.players.length === 0) {
      // Room exists but no players — only initialize player list, not the entire room.
      room.players = [userInfo]; // Initialize players only
      room.host = userInfo.userId; // Assign host as the joining user
      room.fields[userInfo.userId] = { // Initialize user's field
        hand: [],
        money: [],
        props: [
          { cards: [], isFullSet: false, color:'', } // Empty set for properties
        ],
      };
      console.log("Room exists but was empty. Player joined.");
    } else {
      // Handle case where the user is already in the room
      const existingPlayer = room.players.find(p => p.userId === userInfo.userId);
      if (existingPlayer) {
        console.log('Updating existing player:', existingPlayer.userName);
        existingPlayer.userName = userInfo.userName; // Update name if needed
        return [true, false]; // User already existed, no rejoin required
      }
  
      // Handle password check
      if (room.password && password !== room.password) return [false, false]; // Wrong password
      if (room.players.length >= room.maxPlayers) return [false, false]; // Room full
  
      // Add the user to the room
      console.log('New player joining:', userInfo.userName);
      room.players.push(userInfo); // Add player to the list
      room.fields[userInfo.userId] = { // Initialize their field
        hand: [],
        money: [],
        props: [],//how is this happening properly? Is it?
      };
    }
    console.log("Current Players in Room:", room.players);
    userRoomMap[userInfo.userId] = roomId; // Map userId to roomId
    return [true, true]; // Successfully joined
  }
  
};

setInterval(() => {
  for(const roomCode in rooms){
    const room = rooms[roomCode];
    //Ensure host doesn't count as ready for the purpose of ready-check's
    if(room && room.players)
    {
      const hostIndex = room.players.findIndex(p=>p.userId==room.host);
      if(hostIndex >= 0 && room.players[hostIndex]!.isReady == true)
      {
        room.players[hostIndex]!.isReady = false;//
        const hostId = room.host;
        io.to(roomCode).emit('playerReadyToggle',hostId,false,6);
      }
    }
    //If room empty delete room
    if(room && room.players.length == 0)
    {
      room.afkCountdown -= 1
      if(room.afkCountdown == 0)//todo?: learn how to delete room cleanly
        delete rooms[roomCode];//prayge
    }
    else if(room && room.players.length > 0) room!.afkCountdown = 6;

    //Countdown for gamestart + preps when game starts.
    if(room?.timeTicking == true && room.countdown > 0) //tick the countdown 1 second
    {
      const countdown = room.countdown -= 1 
      //ISSUE?: When someone unreadies, the countdown resets, but does not stop ticking.
    
      console.log(`countdown be like: ${countdown}`)
      io.to(roomCode).emit('startCountdownUpdate',(countdown));//Do we need to send any additional data?
      if(countdown == 0 && room.inGame == false)
      {
        room.inGame = true;
        //figure out proper number of decks to shuffle together, etc.+
        const nrDecks:number = Math.ceil(room.players.length / 5)
        room.deck = createDeck(nrDecks);
        room.deck = shuffleDeck(room.deck);
      }
      //TODO? Identify conditions to make inGame false, prob involving after the game concludes.
      if(room.inGame == true && room.players.length === 0)
        room.inGame = false;
    }
    //In game anti-AFK/stall stuff
    if(room && room.inGameTimer)
    {
      room.inGameTimer -= 1;
      if(room.inGameTimer == 0)
        turnEnd(roomCode)
    }
    
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
      else  
      {
        room.players[connectedIndex]!.connected = true;//todo: handle the user disconnect manual -> turn connected false.
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
          room.turnList = rollTurnOrder(roomCode)

          startGame(roomCode);//initialize deck and deal hands to players, then emit deck and all hands to all players.
          //One by one, for each player id, emit their fields to all other players.
          room.actionTaken = false;
          for(const player of room.players)
          {
            const playerId = player.userId;
            io.to(roomCode).emit('playerHandUpdate',playerId, room.fields[player.userId])//Intent: send to each user the userId being affected, plus their cards
            //adjust afk props
            player.wasAFK = false;//good faith. Later need to actually fix the DC cases
          }
          io.to(roomCode).emit('deckUpdate',room.deck);//emit deck once to everyone
          turnStart(roomCode,0)
        }
      }    
    }
  });

  //todo: idk if I want to use card or cardname
  //todo?: Should this be from emitWithAck?
  // socket.on('auditCard',(roomId,turnPlayer,playerId,card) => {
  //   if(turnPlayer == playerId)
  //   {
  //     const actions:string[] = auditCard(roomId,playerId,card);
  //     //emit 
  //   }
      
  // });
//todo: alot of cases to handle prob.
//Leave it to client I guess?
//todo: go back later and fix entire mes
  socket.on('playCard',(roomId,turnPlayer:string,playerId:string,card:Card,targets?:Player[],color?:string,doubleRent?:boolean,quadRent?:boolean) => {
    if(turnPlayer == playerId)//how to handle these events may or may not exist.
    //todo? need to keep in mind targets being player objects
    {
      //implies rent
      //PRAYGE FOR ALL THIS LOGIC PLEASE
      if(color)
      {
        if(targets)
        {
          if(doubleRent)
            useCard(roomId,playerId,card,targets,color,true,false);
          else if(quadRent)
            useCard(roomId,playerId,card,targets,color,false,true);
          else
            useCard(roomId,playerId,card,targets,color,false,false);
        }
        else
          useCard(roomId,playerId,card,targets,color,false,false);
      }
      else
      {
        if(targets)
          useCard(roomId,playerId,card,targets);
        else
          useCard(roomId,playerId,card);
      }   
    }
  });

  socket.on('endTurn',(roomId,turnPlayer,playerId) =>{
    if(turnPlayer == playerId)
      turnEnd(roomId);
  });
});

//todo: How to grab player turn order?
const turnStart = (roomId:string, turnIndex:number) => {
  //set actions to 3, draw 2-5 cards, emit event indicating turn player
  const room = rooms[roomId];
  if(!room) return;
  const playerId = room.turnList![turnIndex] as string;//just for ease of access
  const playerIndex = findPlayerIdIndex(roomId,playerId);
  room.players[playerIndex]!.actions = 3;
  if(room.fields[playerId]?.hand.length == 0)
    drawCard(roomId,playerId,5);
  else
    drawCard(roomId,playerId,2);
  let timer = 180;
  if(room.players[playerIndex]!.wasAFK == true)
    timer = 30;
  io.to(roomId).emit('turnStart',playerId,timer);
  room.inGameTimer = timer;//Hmmm can we let this be divided by 1000 instead.
  room.actionTaken = false;
  room.players[playerIndex]!.wasAFK = true;
}

//TODO: Implement the below
//todo: implement countdown somehow
//Start the next person's turn, check if an action was performed that turn (prob implement actionTaken prop)
const turnEnd = (roomId:string) => {
  const room = rooms[roomId];
  if(!room) return;
  const players = room.turnList;
  const turnPlayer = room.turnPlayer;
  const playerIndex = findPlayerIdIndex(roomId,room.players[turnPlayer]!.userId)
  room.turnPlayer++;
  //assign next turn to next player, cycle if past length
  if(room.turnPlayer >= room.players.length)
    room.turnPlayer = 0;
  //if they were afk, punish them
  if(room.actionTaken == false)
    room.players[playerIndex]!.wasAFK = true;
  turnStart(roomId,room.turnPlayer);
}

//adds player's cards to deck.
const drawCard = (roomCode:string, playerId:string, nrCards:number) => {
  const room = rooms[roomCode];
  if(room)
    for(let i = nrCards; i > 0; i--)
      {
        const [cardToAdd] = room.deck.splice(0,1) as [Card]//should only splice one at a time
        room.fields[playerId]!.hand.push(cardToAdd);
    }
  else
    return;
}
//need to check; might need work
//how to fix this?
const rollTurnOrder = (roomCode:string):string[] => {//todo? determine disconnected cases
  const room = rooms[roomCode]
  if(room)
  {
    let turnOrderList:string[] = [];
    let playerList = rooms[roomCode]!.players;
    for(let i = playerList.length - 1; i >= 0; i--)
      {
        const rng = Math.floor(Math.random()*i);
        turnOrderList.push(playerList[rng]!.userId);
        playerList.splice(rng,1);
      }
    console.log("Turn order: ", turnOrderList);//unsure where to post, if at all.
    return turnOrderList;
  }
  return ['what is this?'];
}
const startGame = (roomCode:string) => {//todo: figure out what I want to return from this
  const room = rooms[roomCode];
  //todo
  //maybe if all of them connect, then start shuffling the deck and dealing them. Dealing prob either be animated or already done.
  if(room)
  {
    room.deck = createDeck(Math.ceil(room.players.length / 5));
    room.deck = shuffleDeck(room.deck,room.discard);
    const inGamePlayers = room.players.filter(p=>p.connected == true);
    for(const player of inGamePlayers)
      drawCard(roomCode,player.userId,5);
    // for(let i = 0; i < room.nrConnected; i++)//prob need to change condition on this
      // drawCard(roomCode,room.players[i].playerId,5);//need to import this function plus other deck.ts functions.
    console.log(`Hands dealt for ${roomCode}`)
  }
}

//prob want to trigger every time the player clicks a card.
//or maybe move this to client to save strain/space on server.
//todo trigger auditCard on every click.
const auditCard = (roomId:string,playerId:string,card:Card) => {
  // const excludeKey = playerId;//Don't let the card player count themselves eligible for card eligibility.
  let acts = [];//todo? Prob need to fix this somehow.
  const room = rooms[roomId];
  if(!room) return;
  const playerIndex = findPlayerIdIndex(roomId, playerId);
  const thePlayer = room.players[playerIndex];
  if(thePlayer!.actions == 0)
    return;
  if(!thePlayer) return
  if(thePlayer.actions >= 0)
  {
      if(card.type != 'property')
          acts.push('money');
      else
          acts.push('property');
      //actions
      switch(card.name)
      {
          case('dealbreaker')://good for now?
              //check each field's props for sets
              let playersWithSets = [];
              for(const otherPlayerId in room.fields)
              {
                  if(otherPlayerId == playerId)//don't check the card player's field
                      continue;//I hope...
                  const otherPlayerSets = checkPlayerSets(roomId, otherPlayerId);
                  if(!otherPlayerSets || otherPlayerSets.length == 0)
                    break;
                  if(otherPlayerSets.length > 0)
                  {
                      if(!acts.includes('action'))
                          acts.push('action');
                      playersWithSets.push(otherPlayerId);//I hope...
                      continue;//I hope...
                  }
              }
              break;
          case('debtCollector'):
              for(const key in room.fields)//for each other user
              {
                  if(key === playerId)//exclude the one who used the card
                      continue;
                  let netWorth:number = 0;
                  //check props then money
                  //unsure if affected by Card->Set change.
                  if(room.fields[key]!.props.length > 0)// if at least 1 set/card in props. prayge
                  //todo: learn to go through 2d array
                  for(const set of room.fields[key]!.props)//prayge
                    for(const card of set.cards)
                      // for(const color of room.fields[key].props)//collector = catch-all term for color of cards/whether in a set or not
                          // for(const card of collection)//for each card in that collection/color
                          netWorth += card.value;
                  if(room.fields[key]!.money.length > 0)//prayge
                      for(const card of room.fields[key]!.money)//prayge
                          netWorth += card.value;
                  if(netWorth > 0)
                  {
                      //todo: push valid targets to acts.
                      if(!acts.includes('action'))
                          acts.push('action');
                      acts.push(key);//intention: push the userId to the list as a valid target for playing the card.
                  }
              }
              break;
          case('forcedDeal'):
          //check turn player's board for any property in play.
              if(room.fields[playerId]!.props.length == 0)//if  player has no props are in play, stop audit. IDK if affected by card->set change
                  break;
              //check other players for any property in play.
              for(const otherPlayerId in room.fields)
              {
                  if(otherPlayerId == playerId)
                      continue;
                  //check other players for non-set properties
                  //If these two are equal, there's nothing to take.
                  if(room.fields[otherPlayerId]!.props == checkPlayerSets(roomId,otherPlayerId))//prayge.
                      continue;
                  if(!acts.includes('action'))
                      acts.push('action');
                  acts.push(otherPlayerId);
              }      
              break;
          case('house'):{
            //Turn player needs to own at least one set.
            //todo: check if there is a house card within the set(s), cancel audit if all sets have houses.
            const ownedSets = checkPlayerSets(roomId,playerId);
            if(ownedSets && ownedSets.length > 0)
            {
                for(const set of ownedSets)//scan through sets
                {
                  if(set.color == 'util' || set.color == 'black')
                    continue;
                  let isEligibleSet:boolean = true;
                  for(const card of set.cards)//scan through cards in each given set
                      if(card.name == 'house')//skip the set if a house card is in there.
                          isEligibleSet = false;
                  if(isEligibleSet)
                  {
                      acts.push('action')
                      break;
                  }
                }
            }
            break;
          }
          case('hotel'):{
            const ownedSets = checkPlayerSets(roomId,playerId);
            if(ownedSets && ownedSets.length > 0)
            {
                for(const set of ownedSets)//scan through sets
                {
                  if(set.color == 'util' || set.color == 'black')
                    continue;
                  let hasHouse:boolean = false;
                  let hasHotel:boolean = false;
                  for(const card of set.cards)//scan through cards in each given set
                  {
                      if(card.name == 'house')
                          hasHouse = true;
                      if(card.name == 'hotel')
                          hasHotel = true;
                  }
                  if(hasHouse && !hasHotel)
                  {
                      acts.push('action')
                      break;
                  }
                }                    
            }
            break;
          }
          case('birthday'):
              for(const otherPlayerId in room.fields)
              {
                  if(otherPlayerId === playerId)
                      continue;
                  if(room.fields[otherPlayerId]!.props.length > 0)//prayge
                  {
                    acts.push('action');
                    break;
                  }
                  if(room.fields[otherPlayerId]!.money.length > 0)//prayge
                  {
                    acts.push('action');
                    break;
                  }
              }
              break;
          case('passGo'):
              acts.push('action');
              break;
          case('slyDeal'):
              //check other players for any property/if they are sets in play.
              for(const otherPlayerId in room.fields)
              {
                  if(otherPlayerId === playerId)//todo? Just make a filtered list and go through that? Or is that wasteful?
                      continue;
                  const otherPlayerProps = room.fields[otherPlayerId]!.props;
                  if(otherPlayerProps == checkPlayerSets(roomId,playerId) || otherPlayerProps.length == 0)//intent: if only sets exist in the player's prop field OR if player doesn't own props, skip
                      continue;
                  if(!acts.includes('action'))
                    acts.push('action');
                  acts.push(otherPlayerId);
              }      
              break;                
          default:
              break;
      }
      //rents
      if(card.type === 'rent')//WHOOPS, did not take the rent card's colors into consideration
      {
        //Need to check colors of rent card, then check which of those colors the turnPlayer owns.
          switch(card.name)
          {
              case('rentWild')://todo?: handle the scope issues here.
                  if(room.fields[playerId]!.props.length > 0)//needs any property to use at all.
                  {
                    const options = doubleRentCheck(room.fields[playerId]!.hand,room.players[playerIndex]!.actions)
                    for(const option of options)
                      acts.push(option);
                  }
                  break;
              default:
                //figure out what colors the player can rent with.
                let rentColors:string[] = []
                for(const color of card.colors!)
                {
                  for(const set of room.fields[playerId]!.props)
                  {
                    if(set.color == color)
                    {
                      rentColors.push(color);
                      break;//should start looking for the next color
                    }
                  }
                }
                if(rentColors.length > 0)
                {
                  let options:string[] = doubleRentCheck(room.fields[playerId]!.hand,room.players[playerIndex]!.actions);
                  for(const option of options)
                    acts.push(option);
                }  
          }
      }
  }
  return acts;
}
//double and quad rent helpers
const doubleRentCheck = (playerHand:Card[], actions:number):string[] => {//0 for regular, 1 for double, 2 for quad
  const doubles = playerHand.filter(c=>c.name = 'doubleRent').length;
  let options:string[] = [];
  if(doubles == 2 && actions == 3)
    options.push('quadRent');
  if(doubles > 0 && actions > 1)
    options.push('doubleRent');
  options.push('rent')
  return options;
}

//A helper for finding the index of a given playerId
const findPlayerIdIndex = (roomCode:string,playerId:string):number=>{
  const room = rooms[roomCode];
  if(!room) return -1;
  return room.players.findIndex(p=>p.userId == playerId);
}

//This assumes that the card was legal to play and that the user played it.
//todo: When properties are involved in trades, need to send events that indicate that changes have been made.
//patch for above, probably just update everyone's boards via events as changes get made.
//todo: let client place props where desired
const useCard = (roomId:string, playerId:string, card:Card, targets?:Player[],color?:string,doubleRent?:boolean,quadRent?:boolean) => {
  const room = rooms[roomId];
  //consume turn player's action
  const playerIndex = findPlayerIdIndex(roomId,playerId);
  if(room)
    room.players[playerIndex]!.actions -= 1;
  room!.actionTaken = true
  room!.players[playerIndex]!.wasAFK =  false;
  let effectResolved = true;
  if(!room) return;
  //Remove card from turn player's hand. i wonder if this works
  //prayge
  const cardIndex:number = room.fields[playerId]!.hand.findIndex(c=>c==card)
  room.fields[playerId]!.hand.splice(cardIndex,1);
  room.discard.push(card);
  if(card.type == 'action')
  {
    //todo: Display to clients that playerId is attempting to play card.cardName
    //probably display for ~4sec
    // const cardName = card.name;
    //This just announces what the player is attempting to play. Unsure if should implement
    // io.to(roomId).emit('attemptAction',playerId,cardName)//attemptAction shows the card in the discard pile, or near the player's field
    //This gives the opportunity to negate said action
    if(respondWithNo(roomId,playerId,false) == true)//cancel the card, waste the action, move on with day
      effectResolved = false;
  }
  if(effectResolved == false)//effect got negated, nothing happens
    return;
  switch(card.name)//How to handle actions...
  {
    //actions
    //might need to review and rework this card
    case('debtCollector'):{//todo: implement event on cilent side.
      //emit event for target player to cough up money to send.
      const robbed = targets![0]!.userId;
      const cardsToSend = io.timeout(30_000).to(roomId).emitWithAck('debtCollector',robbed,(err,response) => {//fix this
        if(err){//if no response, rob money, then give props out until debt paid. todo: implement priority system.
          //check money first
          let moneyPile = rooms[roomId]!.fields[robbed]!.money;
          let netWorth:number = 0;
          let toGive:Card[] = [];
          let paidYet:boolean = false;
          //search for 5 card first; simplest case
          if(moneyPile.length > 0)
          {
            for(const card of moneyPile)//searching for 5's
            {
                // if(moneyPile!.value == 5)
                if(card.value == 5)//tbh idk if/how it will break due to changes, but I feel like it will...
                {
                  const payment:Card = removeCard(roomId,robbed,card) as Card;
                  toGive.push(payment);
                  paidYet = true;
                  // const payment = moneyPile.splice(parseInt(card),1)[0] as Card;
                }
            }
            if(paidYet == false)//Find 10. prob don't want to do though.
            {
              for(const card of moneyPile){//tbh idk if/how it will break due to changes, but I feel like it will...
                // if(moneyPile[card]!.value == 10)
                if(card.value == 10)
                {
                  const payment:Card = removeCard(roomId,robbed,card) as Card;
                  toGive.push(payment);
                  paidYet = true;
                }
              }
            }
              //todo: find a way to prio other cards esp if can pay less than 10.
            if(!paidYet)//go through other bills
            {
              for(const card of moneyPile){
              // for(const card in moneyPile){
                  const payment:Card = removeCard(roomId,robbed,card) as Card
                  toGive.push(payment);
                  netWorth += card.value;//prayge
                  // netWorth += moneyPile[card]!.value//prayge
                  if(netWorth >= 5)
                    break;
              }
            }
          }
          //forgot if a blank set got included for compatibility reasons
          //props non-full sets
          let propsField = rooms[roomId]!.fields[robbed]!.props;
          if(propsField.length > 0)
          {
            for(const set of propsField){//should it still be 'const' set here?
              if(set.isFullSet == true)
                continue;
              for(const card in set)
              {
                const payment = set.cards.splice(parseInt(card),1)[0] as Card;
                toGive.push(payment);
                netWorth += payment.value; 
                if(netWorth >= 5)
                {
                  paidYet = true;
                  break;
                }
              }
            } 
          }
          //Props but full sets, skip if paid already
          if(!paidYet)
          {
            if(propsField.length >= 0)
            {
              for(const set of propsField){
                for(const card in set)
                {
                  if(set.isFullSet == true)
                    set.isFullSet = false;
                  const payment = set.cards.splice(parseInt(card),1)[0] as Card;
                  toGive.push(payment);
                  netWorth += payment.value; 
                  if(netWorth >= 5)
                  {
                    paidYet = true;
                    break;
                  }
                }
              }
            }
          }
          //todo: make sure these cards are also taken away from the giver.
          for(const card of toGive)//todo later; implement sorting function for props.
            giveCard(roomId,playerId,card);
        }
        //proper response; With any luck, might be able to condense to one pile instead.
        else
        {
          for(const card of response.givenCards)//todo: either make sure givenCards/response cards are actually card type, or split them into cards/have client give card names and convert from there.
          {
            removeCard(roomId,robbed,card);
            giveCard(roomId,playerId,card);
          }
        }

      }
    );


        
      // for(const c of cardsToSend.fieldCards)//response
      // {
      //   //check sets
      //   for(const set of room.fields[robbed]!.props)
      //   {
      //     // const firstLength = set.cards.length;
      //     let spliceIndex:number = -1;//if true, splice the c
      //     for(const i in set.cards)//how to break once we get what we need?
      //     {
      //       if(set.cards[i]!.name == c.name)//if the cards match
      //       {
      //         spliceIndex = parseInt(i);
      //         set.isFullSet = false;
      //         break;//does this break the for loop?
      //         //splice the card from the set, give to other player.
      //         //todo? Implement trying to find corresponding set/color.
      //       }
      //       if(spliceIndex != -1)
      //       {
      //         set.cards.splice(spliceIndex,1);//uhh what's more efficient?
      //         //todo: wildcard case?
      //         giveCard(roomId,playerId,card)//todo? since we seem to give a single card at a time, might adjust w that in mind
      //         // room.fields[playerId]!.props.push(c);//todo? Auto-sort sets and the like. 

      //       }
      //     }
      //   }
      // }
      // //todo: check if any cards were sent from money
      // for(const c of cardsToSend.moneyCards)
      // {
      //   for(const i in room.fields[robbed]!.money)
      //   {
      //     let spliceIndex:number = -1;
      //     if(room.fields[robbed]!.money[i]!.name == c.name)
      //     {
      //       spliceIndex = parseInt(i);
      //       break;
      //     }
      //     if(spliceIndex != -1)
      //     {
      //       room.fields[robbed]!.money.splice(spliceIndex,1);
      //       room.fields[playerId]!.money.push(c);//pray.
      //     }
      //   }
      // }
      //give cards to playerId //todo? Need a way to figure out where the cards came from so we can figure out where they should go.
    }
    //todo: handle wildRent case
    case('forcedDeal'):{
      const robber = playerId;//technically not needed, but clarity
      const robbed = targets![0]!.userId;//TWO !'s?
      //fail to respond case: robber auto=gives first valid card, robbed gets first valid card taken.
      //robber picks 1 card from their props and robbed's props. todo: make a pop-up box component appear.
      io.timeout(30_000).to(roomId).emitWithAck('forcedDeal',robber,robbed,(err,response) => {
          if(err){//pick defaults. At the moment does NOT have any prios except earliest set added / eligibility.
            let toGive:Card;
            let toTake:Card;
            let cardGiven:boolean = false;//do we need to give from a full set?
            //so far only handles non-set cases(need to handle event where player only has sets.)
            //Giving card to robbed person. Not full sets
            for(const set of room.fields[playerId]!.props)
            {
              if(set.isFullSet == true)
                continue;
              toGive = set.cards[0] as Card;//todo? handle case where card was played when turn player only has full sets
              removeCard(roomId,playerId,toGive);//todo? convert removeProp to remove both prop AND money type cards
              giveCard(roomId,robbed,toGive);
              cardGiven = true;
              break;
            }
            //Full set case for above
            if(cardGiven == false)
            {
              for(const set of room.fields[playerId]!.props)//hope this autohandles empty sets
              {
                toGive = set.cards[0] as Card;//todo? handle case where card was played when turn player only has full sets
                removeCard(roomId,playerId,toGive);//todo? convert removeProp to remove both prop AND money type cards
                giveCard(roomId,robbed,toGive);
                break;
              }
            }
            //Taking card from robbed person
            for(const set of room.fields[robbed]!.props)
            {
              if(set.isFullSet == true)
                continue;
              toTake = set.cards[0] as Card;
              removeCard(roomId,robbed,toTake);
              giveCard(roomId,playerId,toTake);
              break;
            }
          }
          //response / success case.
          const givenCard = response.give;
          const takenCard = response.take;
          //give this card to the robbed
          const cardToGive = CardDatabase.find(c=>c.name=response.give) as Card;//I hope this works.
          //give this card to the robber
          const cardToTake = CardDatabase.find(c=>c.name=response.take) as Card;//I hope this works.
          removeCard(roomId,playerId,cardToGive);
          giveCard(roomId,robbed,cardToGive);
          removeCard(roomId,robbed,cardToTake);
          giveCard(roomId,playerId,cardToTake);

      });
    }
    //todo: handle double rent case. Prob a separate function.
    case('hotel'):{
      //idea?: send event to player, place hotel on appropriate set.
      //if afk, attach to first available set found
      const setToApply = io.timeout(30_000).to(roomId).emitWithAck('hotel',roomId,playerId,(err,response) => {
        if(err)
        {
          //how to look for house
          for(const set of room.fields[playerId]!.props)
            if(set.isFullSet == true)
            {
              if(set.cards.filter(c=>c.name == 'house').length == 1)
              {
                set.cards.push(card)//hope this works.
                break;
              }
            }
        }
        //response case...how to do? Index maybe?
        //idk if house/hotel check should be done here, but def on client at least
        room.fields[playerId]!.props[response.index]!.cards.push(card)//should be a hotel.
      })
      break;
    }
    //todo:Handle excluding util and railroad case. Applies to Hotel too.
    case('house'):{
      //idea?: send event to player, place hotel on appropriate set.
      //if afk, attach to first available set found
      const setToApply = io.timeout(30_000).to(roomId).emitWithAck('house',roomId,playerId,(err,response) => {
        if(err)
        {
          //how to look for house
          for(const set of room.fields[playerId]!.props)
            if(set.isFullSet == true)
            {
              if(set.cards.filter(c=>c.name == 'house').length == 0)
              {
                set.cards.push(card)//hope this works.
                break;
              }
            }
        }
        //how to handle response case.
        else
        {

        }
        //response case...how to do? Index maybe?
        //idk if house/hotel check should be done here, but def on client at least
        room.fields[playerId]!.props[response.index]!.cards.push(card)//should be a hotel.
      })
      break;
    }
    case('passGo'):{
      drawCard(roomId,playerId,2);
      break;
    }
    case('birthday'):{
      let payers:string[] = [];
      io.timeout(30_000).to(roomId).emitWithAck('birthday',playerId,(err,response)=> {
        if(err)
        {
          for(const p of room.players)
          {
            if(!payers.includes(p.userId))
              handleTimeoutDebt(roomId,playerId,p.userId,2);
          }
        }
        else
        {
          payers.push(response.userId);
          for(const card of response.card)
          {
            const toGive = removeCard(roomId,response.userId,card,playerId) as Card;
            giveCard(roomId,playerId,toGive);
          }
        }
      })
    }
    case('dealBreaker'):{
      //emit to player, ask what they want to steal
      io.timeout(30_000).to(roomId).emitWithAck('dealBreaker',playerId,(err,response) => {
        if(err)
        {
          for(const p of room.players)
          {
            if(p.userId == playerId) continue;
            const propField = room.fields[p.userId]!.props;
            let takenYet:boolean = false;
            for(const set of propField)
            {
              if(set.isFullSet == true)//steal it all
              {
                for(const card of set.cards)
                {
                  removeCard(roomId,p.userId,card);
                  giveCard(roomId,playerId,card);
                }
                takenYet = true;
                // break;//should break the forloop
              }
              if(takenYet == true) break;
            }
          }
        }
        else
        {
          for(const c of response.cards)
          {
            removeCard(roomId,response.userId,c);
            giveCard(roomId,playerId,c);
          }
        }
      }) 
    }

  }
  if(card.type == 'rent')//todo:handle the wildRent case
  {
    const discardDoubleRent = (rentMultiplier:number) => {
      for(let i = 0; i < (rentMultiplier / 2); i--)
      {
        const drIndex = room.fields[playerId]!.hand.findIndex(c=>c.name == 'doubleRent');
        const drCard:Card = room.fields[playerId]!.hand.splice(drIndex,1)[0] as Card;
        room.discard.push(drCard);
      }
    }
    let rentMultiplier:number = 1;
    if(doubleRent)
    {
      rentMultiplier = 2
      discardDoubleRent(2)
    }

    if(quadRent)
    {
      rentMultiplier = 4;
      discardDoubleRent(4)
    }
      
    //now we handle the Say No cases for the whole double rent thing.
    if(respondWithNo(roomId,playerId,false) == true)
      rentMultiplier /= 2;
    //Todo: handle how to get the amount to charge.
    //if possibly undefined, how to identify if target exists (for wildRent case)?
    if(targets)
      chargeRent(roomId,playerId,color!,rentMultiplier,targets[0]!.userId);
    else
      chargeRent(roomId,playerId,color!,rentMultiplier);
    
  }
  //todo: implement event emit/method to display updated cards.
}
//todo:Handle wildprop case here?
const chargeRent = (roomId:string,playerId:string,color:string,rentMultiplier:number,target?:string)=> {//target = target for wild rent case.
  const field = rooms[roomId]!.fields[playerId]!.props;
  let fullSets:number = 0;//this out
  let propCount:number = 0;//non-fullSet props of that color
  let totalRent:number = 0;
  for(const set of field)
  {
    if(set.color == color)
    {
      if(set.isFullSet == true)
        fullSets++;
      for(const card of set.cards)
      {
        if(card.colors && card.colors.includes(color))//hopefully this excludes houses and hotels from counting/interfering w method
          propCount++;
        if(card.name == 'hotel' && set.isFullSet == true)
          totalRent += 4;
        if(card.name == 'house' && set.isFullSet == true)
          totalRent += 3;
      }
    }
  }
  if(fullSets > 0)
    totalRent += (setBreakpoints[color]![-1]! * fullSets) * rentMultiplier;//how to use setBreakpoints?
  //prayge
  if(propCount > 0)
    totalRent += (setBreakpoints[color]![propCount-1]!) * rentMultiplier;
  //prayge
  if(target)//only one person
  {
    io.timeout(40_000).to(roomId).emitWithAck('wildRent',target,totalRent,(err,response) => {
      //if player doesn't respond
      if(err)//prio money, then unfinished sets, then sets. 
        handleTimeoutDebt(roomId,playerId,target,totalRent)
      //else if player does respond //might use index to send to turnPlayer, or just use cards as each response
      else
      {
        for(const card of response.toGive)//will either consolidate all cards into one pile, or separate into 2 piles
        {
          giveCard(roomId,playerId,card);
          removeCard(roomId,target,card,playerId);
        }
      }
    })
  }
  else//all people
  //tbh I forget or idk how to handle the error response.
  {
    let payers:string[] = [];//informs us who has and hasn't responded. anyone not on payers just auto-pays
    //todo: all this below.
    io.timeout(40_000).to(roomId).emitWithAck('rent',totalRent,(err,response) => {
      //how to make it so that each successful response gives the id?
      if(err){
        for(const p of rooms[roomId]!.players)
        {
          if(!payers.includes(p.userId))
            handleTimeoutDebt(roomId,playerId,p.userId,totalRent);
        }
      }
      else
      {
        payers.push(response.userId);
        //pay using what is provided.
        for(const card of response.toGive)
        {
          giveCard(roomId,playerId,card);
          removeCard(roomId,playerId,card,playerId);
        }
      }
    })
  }
}
//todo? Helper function for debt handling + money passing: prob just helps timeout people
const handleTimeoutDebt = (roomId:string,paidId:string,robbed:string,amount:number) => {
  //check money first
  const moneyPile = rooms[roomId]!.fields[robbed]!.money;
  let netWorth:number = 0;
  let toGive:Card[] = [];
  let paidYet:boolean = false;
  //money pile
  if(moneyPile.length > 0)
  {
    for(const i in moneyPile)
    {
      const payment = moneyPile.splice(parseInt(i),1)[0] as Card//prayge / why this work?
      toGive.push(payment);
      netWorth += moneyPile[parseInt(i)]!.value;
      if(netWorth >= amount)
      {
        paidYet = true;
        break;
      }
    }
  }

  //properties
  const propsPile = rooms[roomId]!.fields[robbed]!.props
  //Go through non-sets first
  for(const set of propsPile)
  {
    if(set.isFullSet == true)
      continue
    else
    {
      for(const card of set.cards)//prayge
      {
        const payment = removeCard(roomId,robbed,card,paidId) as Card;
        toGive.push(payment);
        netWorth += payment.value;
        if(netWorth >= amount)
        {
          paidYet = true;
          break
        }
        // if(netWorth >= amount)//todo: handle wildprop case.
        // {
          // let hasWildProp:boolean = false;
          // let hasOtherProps:boolean = false;
          // for(const p of set.cards)
          // {
          //   if(p.type == 'property')
          //   {
          //     if(p.name != 'wildProp')
          //     {
          //       hasOtherProps = true;
          //       break;//prob break.
          //     }
          //     else
          //       hasWildProp = true;
          //   }
          // }
        //   if(hasWildProp && hasOtherProps == false)
        //   {
        //     const wildIndex:number = set.cards.findIndex(c=>c.name == 'wildProp');//prayge
        //     const wildGive:Card = set.cards.splice(wildIndex,1)[0] as Card;
        //     toGive.push(wildGive);
        //   }
        //   paidYet = true;
        //   break;        
        // }
      // }
      }
    }
  }

  //go through sets now
  //prob handle wild case here too
  for(const set of propsPile)
  {
    for(const i in set)//prob want to rework here?
    {
      const payment = set.cards.splice(parseInt(i),1)[0] as Card;
      toGive.push(payment);
      netWorth += payment.value;
      set.isFullSet = false;
      if(netWorth >= amount)
        break;
    }
  }
  //give these cards to the robber
  for(const card of toGive)
    giveCard(roomId,paidId,card);//uhh todo?:rework giveProp to handle prop AND money cards
}

//TODO: Prob want to stick with a consistent decision: detect cards by card name or by the card itself
//todo?: combine sets if applicable. But unsure when exactly to do so.
//above: prob let client rearrange that, but...
//todo: implement event for server to reflect client's rearrangement.

//i wonder how to pinpoint the exact card to remove, not just pray no other copies exist.
//what was this used for?

//todo: handle the house/hotel in money/prop pile cases.
const removeCard = (roomId:string,playerId:string,cardToRemove:Card,wildRobber?:string) => {
  const room = rooms[roomId];
  if(!room) return;
  const propField = room.fields[playerId]!.props;
  let removedYet:boolean = false;//was the card removed yet?
  let passWild:boolean = false;
  if(cardToRemove.type == 'property')
  {
    for(const set of propField)
    {

      if(!cardToRemove.colors!.includes(set.color))
        continue;
      //is it possible to rework below part?
      const ctrIndex:number = set.cards.findIndex(c=>c == cardToRemove);//prayge
      if(ctrIndex)//does this exist here?
      {
        set.cards.splice(ctrIndex,1);
        removedYet = true;
        if(setBreakpoints[set.color]!.length == 2)
        {
          let hasWild:boolean = false;
          for(const card of set.cards)
          {
            if(card.name == 'wildProp')
            {
              hasWild = true;
              break;
            }
          }
          if(hasWild == true)
          {
            const wildIndex:number = set.cards.findIndex(c=>c.name == 'wildProp');
            set.cards.splice(wildIndex,1);//todo: how to give wildProp to the player after?
            passWild = true;
          }
        }
        break;
      }
    }
  }
  if(!removedYet)//is a money/action card
  {
    const moneyField = room.fields[playerId]!.money
    for(const i in moneyField)//hope this works; should since this assumes the card exists to begin;
    {
      if(moneyField[parseInt(i)] == cardToRemove)
      {
        moneyField.splice(parseInt(i),1);
        removedYet = true;
      }
      if(removedYet) break;
    }
  }                        
  if(passWild == true)//prayge
  {
    const wildProp:Card = CardDatabase.find(c=>c.name == 'wildProp') as Card;//prayge
    giveCard(roomId,wildRobber!,wildProp);
  }
  return cardToRemove;//This does come up in a function call                                                                                                          
}

//playerId represents the player who prompts this method; as such, they are excluded from being able to play No
//todo: Probably need to shove this into an event listener.
//idea:bool b/c true for card got negated, false for card went through.
const respondWithNo = (roomId:string,playerId:string,isNo:boolean):boolean => {
  const room = rooms[roomId];
  if(!room)
    return false;//I guess
  // let firstResponse = '';
  for(const userId in room.fields)
  {
    if(userId === playerId)
      continue
    //todo? Make a date object for 20 seconds from the message, and handle from there, but lots of work for sure.

    //below says players get up to 20 sec to decide whether to play No or not. Players without No fake their responses for 5-10sec
    let responseTimer:number = 0;
    if(room.fields[userId]!.hand.length > 0)//todo: Let hand be a possibly empty array.
    {
      if(room.fields[userId]!.hand.some(c=>c.name == 'sayNo'))
        responseTimer = 20;
      else
        responseTimer = rollResponseTimer();
    }
      responseTimer = (room.fields[userId]!.hand.some(c=>c.name == 'sayNo') ? 20 : rollResponseTimer())
        responseTimer = 20;
    //gonna experiment a bit
    let noPlayer:string = '';//userId
    const firstResponse = io.timeout(20000).to(roomId).emitWithAck('playNoPrompt',roomId,playerId,(err,responses) => {
      if(err == room.players.length)//Intent: if no players respond / all let the card through. idk if this works
      {
        if(isNo == true)
          return true;//card effect does not go through
        else
          return false;//card effect goes through
      }
      for(const r in responses)//unsure if 'r of responses' would change the order
      {
        if(responses[r].playedNo == true)
        {
          noPlayer = responses[r].userId;
          break;
        }
      }
      //want to announce that noPlayer has used No, then repeat this function.
      return respondWithNo(roomId,noPlayer,true);//unsure if this can work.
    });
  }

  return false
}

const rollResponseTimer = ():number => {
  const timer = Math.floor(Math.random() * 10);
  return timer > 5 ? timer : 5;
}
//this also updates boards to properly break up excess sets, but hope it breaks nothing.
//return number?
//todo? learn to better handle checkPlayerSets' return type
const checkPlayerSets = (roomId:string, playerId:string):Set[]|undefined => { //returns target player's full sets of properties.
  const room = rooms[roomId]
  if(room)
    return room.fields[playerId]?.props.filter(s=>s.isFullSet === true)//I guess can return undefined.
}


const giveCard = (roomId:string, playerId:string, card:Card,wildColor?:number) => {//only adds the card, doesn't take from someone else
  const field = rooms[roomId]!.fields[playerId]!.props;
  let isPushed: boolean = false;//unsure if needed
  // const colorToUse = (wildColor ? card.colors![wildColor] : card.colors![0]) as string;
  let colorToUse:string = '';
  //just emit and ask what color the player wants. Default to 1st color if no response
  if(card.type != 'property')
  {
    rooms[roomId]!.fields[playerId]!.money.push(card);
    return;
  }
    
  if(card.colors!.length > 1)
  {
    const colorChoices:string[] = card.colors!;
    io.timeout(20_000).to(roomId).emitWithAck('pickColor',playerId,colorChoices,(err,response) =>
    {
      if(err)
        colorToUse = card.colors![0]!;//prayge
      else
        colorToUse = colorChoices[response.choice] as string;//prob be a number.
    }
    )//need to remember colorChoices is an array
  }
  if(colorToUse == '')
    colorToUse = card.colors![0] as string;//if not wildcard, use the sole color

  for(const set of field)//check where to send the card if possible.
  {
    if(!set.isFullSet)
      continue;
    if(set.color != colorToUse)
      continue;
    //I am assuming that this will only happen if an appropriate set is found
    set.cards.push(card);
    isPushed = true;
    //todo: handle completing sets when condition is met.
    let propCount:number = 0;
    for(const card of set.cards)
    {
      if(card.colors!.includes(colorToUse))
        propCount++;
      if(propCount == setBreakpoints[colorToUse]!.length)//prayge
        set.isFullSet = true;
    }
    break;
  }
  if(!isPushed)
    field.push({cards:[card],isFullSet:false,color:colorToUse})
}

//TODO: Make 1-2 helper functions
//1?. Sort money cards
//2. Organize properties and sets upon aquisition.
// const 

// const setBreakpoints = [ //color:how many properties of that color that it takes to become a full set.
const setBreakpoints:Record<string,number[]> = {
  blue:[3,8],
  green:[2,4,7],
  sky:[1,2,3],
  brown:[1,2],
  magenta:[1,2,4],
  orange:[1,3,5],
  yellow:[2,4,6],
  red:[2,3,6],
  black:[1,2,3,4],
  util:[1,2]
  // {blue:[3,8]},
  // {green:[2,4,7]},
  // {sky:[1,2,3]},
  // {brown:[1,2]},
  // {magenta:[1,2,4]},
  // {orange:[1,3,5]},
  // {yellow:[2,4,6]},
  // {red:[2,3,6]},
  // {black:[1,2,3,4]},
  // {util:[1,2]}  
// ];
};

server.listen(8080, () => {
  console.log("listening on port 8080");
});

