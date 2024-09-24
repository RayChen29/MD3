import "./GameRoomSettingsComponent.css";
import React, {useRef, useContext, useState, useEffect } from 'react';
import {GameContext} from '../GameRoom';


//idk if need to import socket io library b/c of context.
const pwToAsterisks = (pw:string|null) => {
    if(pw)
        return ('*'.repeat(pw.length));
    return '';
}
//TODO: 
// const EditPWComponent = () => {
//     <input value={password}>Confirm</input>
//     <button onClick={togglePWediting}>Cancel</button>
// };

// TODO?: Add CSS for this component

//TODO: Consolidate canstart/ready checks into function, slap onto useEffects.


//TODO: add host-toggled privileges
//TODO: check client's own ready status and id vs being able to click start button and un/ready buttons
const GameRoomSettingsComponent = () => {
    const game = useContext(GameContext);
    if (!game)
      throw new Error("GameContext must be used within a GameContext.Provider");
//TODO: adjust Start-ability based on number of readied players vs # of players in the room.
    // const {maxPlayers, password, setPassword} = game;
    //TODO: LEARN useREDUCER. THERE'S WAY TOO MANY useSTATES RIGHT NOW
    const {host,setHost, userId, roomCode,players,maxPlayers, password, setPassword, userSocket} = game;
    const [hiddenPassword,setHiddenPassword] = useState(pwToAsterisks(password))
    const [pwIsHidden,setPwIsHidden] = useState(true);
    const [isEditingPW,setIsEditingPW] = useState(false)
    const [newPassword, setNewPassword] = useState(password ?? "");
    const [isReady,setIsReady] = useState(false);//maybe need to move
    // const [isHost,setIsHost] = useState(false);//maybe need to move
    // const [readyPlayers,setReadyPlayers] = useState(0);//Number of Readied Players. Prob need to move
    const [canStart,setCanStart] = useState(false);

    //ah. Maybe the canStart check ends up ruining what I want to achieve
    const readyStartCheck = () => {
        const ready = players.filter(p=>p.isReady == true).length;
        // setReadyPlayers(ready);
        if(players.length == 1)
            return true
            // setCanStart(false);
        if(players.length == 2)
        {
            if(ready == 1)//maybe this needs to update somehow? somehow doesn't update back to false?
                return true
                // setCanStart(true);
            else
                return false
                // setCanStart(false);
        }
        else
        {
            //TODO: figure out the math/algo here
            if(ready >= (players.length-2))//Basically if all players are ready besides host and 1 other.
                return true
                // setCanStart(true);
            else
                return false;
                // setCanStart(false);
        }
    }
    //wait. Wasn't this already a thing?
    useEffect(() => {
        if((host === userId) && readyStartCheck() == true)
            setCanStart(true);
        else
            setCanStart(false);
            // setIsHost(true);
        // readyStartCheck()
    },[])
//This useEffect just affects buttons on client-side. Should not really do much for server interaction.
    useEffect(()=> {//players join/leave/ready/unready. 
        if(host === userId && readyStartCheck() == true)
            setCanStart(true);
        else
            setCanStart(false);
            // setIsHost(true);
        // readyStartCheck();


    },[players])

    const toggleHide = () => {
        setPwIsHidden(!pwIsHidden);
    }
//uhhh how to do this?
    const toggleIsEditing = () => {
        setIsEditingPW(!isEditingPW)
    }

    //TODO: implement updatePassword method Includes connecting to server to change password
    const updatePassword = async() => {
        const updatePWRequest = await userSocket.emitWithAck('updatePW', roomCode, userId,newPassword);
        if(updatePWRequest.status === true)//pw got changed.
            setPassword(newPassword);//Maybe need to add a useEffect?
    }

    useEffect(() =>{
        setIsEditingPW(!isEditingPW);
        setHiddenPassword(pwToAsterisks(password))
    },[password])

    const hostStart = async() =>{
        //send event to start
        //I do admit this is weak 'security/assurance', but am not sure how much time effort to put into this
        console.log('host wants to start game.')
        userSocket.emit('gameStartCountdown',(roomCode));
        //create a countdown element. When it reaches 0, either take down the page or redirect to new page?
    };
/*TODO: Handle ready cases + rules:
    Host must start the game
    All but 1 player + host must be ready before game can officially start.
        - For 2 people, the not-host must ready up before host can start.
        
    
*/
//TODO: Status does get updated so you see the ready when you refresh, but need immediate feedback, even on original client
//On the bright side, when one client refreshes, everybody does see it.
//TODO: Inconsistent, but the host/ready bugs are occuring. 
//TODO? Pretty sure there is a bug in there about the host and their ready status and them being host not having their ready status disabled.
    const toggleReady = async() => {
        const readyRequest = await userSocket.emitWithAck('toggleReady',roomCode,userId);
        // console.log
        // if(readyRequest.status === true)//request went through, change ready status
            // setIsReady(!isReady)
        //maybe give fail case?
    }
    // useEffect(() => {
        // userSocket.emitWithAck('')
    // },[isReady])

//TODO: For isEditingPW, encapsulate everything passwords.
//TODO?:set pw buttons below pw.
    return (
        <div className="gameRoomSettings">
            {/* TODO: grab max players */}
            {/* TODO: Have MaxPlayers as a drop-down probably */}
            <div>Max Players: {maxPlayers}</div>
            <div className="password-field" >
                {
                    !isEditingPW && (
                        <>
                            {pwIsHidden && `Password: ${hiddenPassword}`}
                            {!pwIsHidden && `Password: ${password}`}
                            <button onClick={toggleHide}>
                                {pwIsHidden && `Show`}
                                {!pwIsHidden && `Hide`}
                            </button>
                            <button onClick={toggleIsEditing} disabled = {host != userId} >Edit</button>
                        </>
                    )
                }
                {
                    isEditingPW && (
                        <>
                            {/* <span> TODO later? force confirm/cancel buttons to same row somehow*/}
                              <input value={newPassword}
                              onChange={(e) => setNewPassword(e.target.value)}/>
                              <button onClick={updatePassword}>Confirm</button>
                              <button onClick={toggleIsEditing}>Cancel</button>
                            {/* </span> */}
                        </>
                    )
                }
            </div> 
            {/* TODO: handle Ready and Start button logics */}
            <button 
                onClick={toggleReady}
                className="readyButton"
                disabled={host == userId}
            >
                {isReady ? "Unready" : "Ready"}
            </button>
            <button onClick={hostStart}className="startButton" disabled={!canStart}>Start</button>
            {/* TODO: Fix start button disabled logic for joiners bc it appears enabled due to logic. */}
        </div>
    );
}

export default GameRoomSettingsComponent;