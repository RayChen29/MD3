import React from 'react';
import { createPortal } from 'react-dom';
import './PickNameModal.css';
import {useNavigate} from 'react-router-dom';

interface IsNotLegitModalProps {
 
}
const IsNotLegitModal: React.FC<IsNotLegitModalProps> = () => {
  const navigate = useNavigate();
  const returnNavigate = () => {
    let redirectLink = window.location.href;
    if(redirectLink[-1] === '/') 
      redirectLink = redirectLink.slice(0,-1)
    navigate(-1);//TODO: correct the navigation destination.
  }
  return createPortal(
    <div className="pickNameModal">
      <div className="modalContent">
        <h2>Sorry! Room doesn't exist!!</h2>
        <button onClick={returnNavigate}>Return to Home</button>
      </div>
    </div>,
    document.getElementById('root')!
  );
};

export default IsNotLegitModal;
