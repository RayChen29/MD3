import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.tsx'
import './index.css'
import ErrorPage from "./errorpage"; <ErrorPage/>
import GameRoom from "./gameRoom/GameRoom.tsx"
import {
  createBrowserRouter,
  RouterProvider,
  // Outlet, //I think we use <Outlet/> in an actual component? Need to learn
  //Must use outlet when want to render child components
  // Link //I think use alongside Outlet to allow Client Side Rendering?
} from "react-router-dom";
// import io from 'socket.io-client';

const router = createBrowserRouter([
  {
    path: "/",
    element: <App/>,
    errorElement: <ErrorPage/>,

  },
  {
    path:"/:roomCode",
    element: <GameRoom/>,
    errorElement: <ErrorPage/>,
  },
  {
    path:"/:roomCode/game",
    //need to make InGame element
    errorElement: <ErrorPage/>,
  }
]);

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <RouterProvider router={router} />
  </React.StrictMode>,
)
