"use strict";
//TODO: Make joinroom navigate people properly. Probably entails hopping into the client.
//TODO: Need to fix client's ability to join rooms from the button.  Been broken ever since trying to fix infrastructure
//TODO: Add the periodic room check, make sure empty rooms don't exist too long.
var __assign = (this && this.__assign) || function () {
    __assign = Object.assign || function(t) {
        for (var s, i = 1, n = arguments.length; i < n; i++) {
            s = arguments[i];
            for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p))
                t[p] = s[p];
        }
        return t;
    };
    return __assign.apply(this, arguments);
};
var __spreadArray = (this && this.__spreadArray) || function (to, from, pack) {
    if (pack || arguments.length === 2) for (var i = 0, l = from.length, ar; i < l; i++) {
        if (ar || !(i in from)) {
            if (!ar) ar = Array.prototype.slice.call(from, 0, i);
            ar[i] = from[i];
        }
    }
    return to.concat(ar || Array.prototype.slice.call(from));
};
Object.defineProperty(exports, "__esModule", { value: true });
//TODO: handle host properties on both client and server sides.
var express = require("express");
var node_http_1 = require("node:http");
var socket_io_1 = require("socket.io");
var app = express();
//chat?
// app.use('cors');
var server = (0, node_http_1.createServer)(app);
var io = new socket_io_1.Server(server, {
    cors: {
        origin: "http://localhost:5173",
    },
    connectionStateRecovery: {},
});
//Might need to migrate userIDs to the UserRoomList
var userIDs = [];
var rooms = {};
var defaultRoomCap = 5;
var ROPE_CONST = 2;
var userRoomMap = {};
var createPlayer = function (userId, userName) { return ({
    userId: userId,
    userName: userName,
    rope: 0,
}); };
//prayge
//refactor this for the new format, or just take the specifics from the submitted info?
//TODO?: on sufficient disconnect time / game end / afk time, unbind userId from room code
//Ah never handled the case of the id already being in the room.
//TODO? Probably need an id check, and change names if identical id's are found.
//TODO: Probably check if rooms are legitimate (maybe not necessarily HERE, but somewhere below maybe?)
var playerJoinRoom = function (roomId, userInfo, password, //idk if this even needs ot be questioned.
roomMax) {
    var _a, _b, _c, _d, _e;
    var room = rooms[roomId];
    if (!userInfo || !userInfo.userId || !userInfo.userName) {
        console.error('Invalid userInfo:', userInfo); //Multiple calls made (2 of them), this fail case happens twice.
        return [false, false];
    }
    var roomPw = password ? password : "";
    roomMax = roomMax ? roomMax : defaultRoomCap;
    // if(!password)
    if (!room || (room.players.length == 0)) { //If room don't exist, make room
        rooms[roomId] = {
            inGame: false,
            players: [userInfo],
            host: userInfo.userId,
            maxPlayers: roomMax,
            password: roomPw,
        }; //Should this be userId instead? Idk.
        userRoomMap[userInfo.userId] = roomId; //artifact? idk
        console.log("JOINED PLAYERS NEW ROOM", rooms[roomId].players);
        return [true, true];
    }
    else { //room exists
        if (!room.players || room.players.length == 0) { //need to initialize room's players.
            // const newPlayer = createPlayer(userInfo.userId, userInfo.userName);
            rooms[roomId] = {
                inGame: false,
                players: [userInfo],
                host: userInfo.userId,
                maxPlayers: roomMax,
            };
            console.log("Room exists, but was empty. Player joined room");
        }
        else {
            if (!userInfo) { //how was it slipping through to begin with?
                console.log('userInfo is undefined');
                return [false, false];
            }
            //unsure if this case is useful now or later.
            var existingPlayer = room.players.findIndex(function (p) { return p.userId == userInfo.userId; }); //this is just a number, right?
            if (existingPlayer !== -1) { //If found, change name on file to client's new declared name.
                console.log('name before: ', (_b = (_a = rooms[roomId]) === null || _a === void 0 ? void 0 : _a.players[existingPlayer]) === null || _b === void 0 ? void 0 : _b.userName);
                rooms[roomId].players[existingPlayer].userName = userInfo.userName;
                console.log('name after: ', (_d = (_c = rooms[roomId]) === null || _c === void 0 ? void 0 : _c.players[existingPlayer]) === null || _d === void 0 ? void 0 : _d.userName);
                // existingPlayer.userName = userInfo.userName;
                console.log('Name changed.');
                return [true, false];
            }
            //password exists and guessed wrong.
            if (room.password && password !== room.password)
                return [false, false];
            //No free slots for new joiners.
            if (room.players.length >= room.maxPlayers)
                return [false, false];
            //if all conditions true, get them in.
            console.log('player was not here yet, so create');
            //  const newPlayer = createPlayer(userInfo.userId,userInfo.userName);
            //  rooms[roomId].players.push(newPlayer);//maybe reword
            //maybe need reword?
            if (rooms[roomId])
                rooms[roomId].players = __spreadArray(__spreadArray([], rooms[roomId].players, true), [userInfo], false);
            // else
            // rooms[roomId].players = [];
        }
        console.log("JOINED PLAYERS", (_e = rooms[roomId]) === null || _e === void 0 ? void 0 : _e.players);
        userRoomMap[userInfo.userId] = roomId;
        //in any case, bind
        console.log("playerjoinroom END");
        return [true, true];
    }
    ;
};
io.on("connection", function (socket) {
    console.log("a user connected");
    socket.on("customDisconnect", function (userId, roomCode) {
        var _a;
        console.log('disconnector: ', userId, roomCode); //Ah. Room Code gets undefined.
        var room = rooms[roomCode];
        if (room) {
            // if (room && room.players) {
            var roomPlayers = room.players;
            if (roomPlayers.length >= 1 && roomPlayers.find(function (p) { return p.userId === userId; }) != undefined) {
                var newRoomRoster = roomPlayers.filter(function (p) { return p.userId != userId; });
                room.players = newRoomRoster;
                //if room is still has players?
                var newHost = (_a = newRoomRoster[0]) === null || _a === void 0 ? void 0 : _a.userId;
                if (newHost && newHost != userId)
                    room.host = newHost;
                //TODO: handle host shifting case.
                //praying this logic works
                //if the leaver was the host, switch permissions.
                console.log('newRoomRoster: ', newRoomRoster);
                socket.to(roomCode).emit('playerLeave', userId, newRoomRoster); //I think?
            }
        }
    });
    //any reason so far dc is
    socket.on("disconnect", function () { console.log("user disconnected"); });
    //Creates a userId for the client('s browser)
    socket.on("generateId", function (ackCallback) {
        var userId = "";
        var isIdTaken = false;
        var charaPool = "qwertyuiopasdfghjklzxcvbnm1234567890";
        do {
            var maybeId = "";
            for (var i = 0; i < 6; i++) {
                maybeId += charaPool[Math.floor(Math.random() * charaPool.length)];
            }
            isIdTaken = userIDs.includes(maybeId);
            if (!isIdTaken)
                userId = maybeId;
        } while (isIdTaken);
        userIDs.push(userId);
        ackCallback({ userId: userId });
        console.log("Generated userId:", userId); // Add this line
    });
    //Need to make this less confusing.
    socket.on("isRoomMade", function (roomCode, ackCallback) {
        var room = rooms[roomCode];
        if (!room)
            ackCallback(false);
        ackCallback(true);
    });
    //TODO: even when hosting room, roomCode ends up undefined, probably when grabbing it from the emitted event.
    socket.on("hostRoom", function (submitInfo) {
        var userId = submitInfo.userId, userName = submitInfo.userName, password = submitInfo.password, roomCode = submitInfo.roomCode;
        var hostPlayer = createPlayer(userId, userName);
        console.log("hostRoom ", userId, userName, password, roomCode);
        playerJoinRoom(roomCode, hostPlayer, password, defaultRoomCap); //TODO: defaultRoomCap is a placeholder(I think for now)
        socket.emit("redirectToLobby", __assign({}, submitInfo));
    });
    //This event should be for entering the link;
    //Need to make a separate event for joining the game within that room.
    //TODO: Room is undefined if joined without creating first
    //TODO: make a enter room link event, and split that from joining the game room.
    socket.on('enterLink', function (submitInfo, ackCallback) {
        var userId = submitInfo.userId, userName = submitInfo.userName, password = submitInfo.password, roomCode = submitInfo.roomCode;
        console.log("ENTER LINK: ", userId, userName, password, roomCode);
        var userInfo = createPlayer(userId, userName); //maybe offending?
        if (!ackCallback || typeof ackCallback !== 'function') { // Added: Ensure ackCallback is a function
            console.error("ackCallback is not provided or not a function");
            return;
        }
        var joinResult = playerJoinRoom(roomCode, userInfo, password);
        console.log("joinResult: ", joinResult);
        var status;
        if (joinResult[0] === false)
            status = 'failed'; //user fails, but gets navigated anyways. huh?
        else
            status = (joinResult[1] == true ? 'player joined' : 'player already joined, no further action taken');
        if (joinResult[1] === true) //not sure how much this inefficiency matters
            userRoomMap[userId] = roomCode; //maybe?
        console.log('enterlink status: ', status);
        ackCallback(__assign({ status: status }, submitInfo));
        //TODO? Maybe unbind userId's from rooms if they join another one sucessfully? Apply this to Hosts too.
    });
    //MIGHT NEED TO OVERHAUL THE JOINING PROCESS ON SERVER SIDE.
    //REMINDER: Players enter the link and join the room in the same command.
    //joinRoom should prob just be a check for if they went through the process, NOT to join again.
    socket.on('joinRoom', function (roomCode, userInfo, ackCallback) {
        var _a, _b;
        var players;
        var status;
        if (userRoomMap[userInfo.userId] === roomCode) {
            players = ((_a = rooms[roomCode]) === null || _a === void 0 ? void 0 : _a.players) || []; // Ensure players is an array
            status = 'authenticated';
        }
        else {
            status = 'join fail';
        }
        socket.join(roomCode);
        // Emit the full player list
        var playerList = ((_b = rooms[roomCode]) === null || _b === void 0 ? void 0 : _b.players) || [];
        socket.to(roomCode).emit('playerJoin', playerList); // Emit the array of players
        ackCallback({
            status: status,
            players: players
        });
    });
    // socket.on
});
server.listen(8080, function () {
    console.log("listening on port 8080");
});
