import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import ErrorPage from './errorpage';
import GameRoom from './gameRoom/GameRoom.tsx';
import InGame from './gameRoom/inGame/inGame';
import {
  createBrowserRouter,
  RouterProvider,
} from 'react-router-dom';
import { SocketProvider } from './SocketContext';

const router = createBrowserRouter([
  {
    path: '/',
    element: <App />,
    errorElement: <ErrorPage />,
  },
  {
    path: '/:roomCode',
    element: <GameRoom />, // Renders GameRoom when navigating to /:roomCode
    errorElement: <ErrorPage />,
    children: [
      {
        path: 'game', // This is a nested route under /:roomCode
        element: <InGame />, // Render InGame instead of GameRoom
        errorElement: <ErrorPage />,
      },
    ],
  },
]);

ReactDOM.createRoot(document.getElementById('root')!).render(
  <SocketProvider>
    <React.StrictMode>
      <RouterProvider router={router} />
    </React.StrictMode>
  </SocketProvider>
);
