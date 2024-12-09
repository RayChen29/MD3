import React, { createContext, useContext, useEffect, useState } from 'react';
import { io, Socket } from 'socket.io-client';

// Define the shape of the context
interface SocketContextType {
    socket: Socket | null;
  }
  
  // Create the context with an initial value of null for the socket
  export const SocketContext = createContext<SocketContextType>({
    socket: null,
  });
// SocketProvider component
export const SocketProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [socket, setSocket] = useState<Socket | null>(null);
  
    useEffect(() => {
      // Connect to the socket server
      const socketConnection = io('http://localhost:8080');  // Replace with your server URL
  
      setSocket(socketConnection);
  
      // Cleanup on unmount
      return () => {
        socketConnection.disconnect();
      };
    }, []);
  
    return (
      <SocketContext.Provider value={{ socket }}>
        {children}
      </SocketContext.Provider>
    );
  };