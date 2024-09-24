
import { useState, useEffect } from 'react'
import './App.css'
import HostModal from './host/HostModal';
import JoinForm from './join/JoinForm';
import io from 'socket.io-client';
// import {
//   Outlet, //Used to render child components I think
//   Link, //Used with Outlet to support client side rendering I think
// } from 'react-router-dom';

export default function Front() { //AKA App
  //TODO: Maybe make this a cookie(thinking 1 day or so)
  const idCheck = async () => {
    console.log('idcheck');
    const id = localStorage.getItem('userId');
    if (!id) {
      console.log('idCheck failed');
      const idSocket = io('http://localhost:8080');
      idSocket.on('connect', async () => {
        try {
          console.log('connecting for id make');
          //Process seems to be stuck here.
          const response = await idSocket.emitWithAck('generateId');
          // if (response.userId) { // Handle case where this doesn't go through
          //userId gets generated twice (can tell because server side says so)
          //However, userId becomes undefined according to localStorage. 
          //Fixed now I believe. Problem was assigning userId to a string.
            localStorage.setItem('userId', response.userId);
            console.log('userId should be set',response.userId);//userId comes out undefined. I guess this mean it got fkd from server side.
          // }
        } catch (error) {
          console.error('Error generating ID:', error);
        } finally {
          idSocket.disconnect(); // Disconnect after handling
        }
      });
    }
  };

  const [isHostPage, setHostPage] = useState(false);
  const [isJoinPage, setJoinPage] = useState(false);

  useEffect(() => {
    idCheck();
  }, []);

  useEffect(() => {

      
    // Add or remove the 'darkBackgroundBody' class to the body element based on 'isHostPage'
    if (isHostPage) {
      document.body.classList.add('darkBackgroundBody');
    } else {
      document.body.classList.remove('darkBackgroundBody');
    }
    // Clean up the effect
    return () => {
      document.body.classList.remove('darkBackgroundBody');
    };
  }, [isHostPage]);

  useEffect(() => {
    // Add or remove the 'darkBackgroundBody' class to the body element based on 'isJoinPage'
    if (isJoinPage) {
      document.body.classList.add('darkBackgroundBody');
    } else {
      document.body.classList.remove('darkBackgroundBody');
    }
    // Clean up the effect
    return () => {
      document.body.classList.remove('darkBackgroundBody');
    };
  }, [isJoinPage]);



  return (
    <div className="frontDiv">
      <button onClick={() => setHostPage(!isHostPage)}>Host Game</button>
      {isHostPage && <HostModal onClose={()=>setHostPage(!isHostPage)}/>}
      <button onClick={() => setJoinPage(!isJoinPage)}>Join Game</button>
      {isJoinPage && <JoinForm onClose={()=>setJoinPage(!isJoinPage)}/>}
      <button> How to Play </button> 

    </div>
  );
}
