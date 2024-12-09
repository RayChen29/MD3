import React, { useContext, useEffect } from 'react';
import { Formik } from 'formik';
import * as Yup from 'yup';
import { useNavigate } from 'react-router-dom';
import { SocketContext } from '../SocketContext'; // Import SocketContext
import './HostModal.css';

interface HostModalProps {
  onClose: () => void;
}

const HostModal: React.FC<HostModalProps> = ({ onClose }) => {
  const { socket } = useContext(SocketContext);  // Access the socket from the context
  const navigate = useNavigate();

  useEffect(() => {
    if (!socket) return; // Ensure the socket is available

    // Handle redirection to the lobby
    socket.on('redirectToLobby', (submitInfo) => {
      const { userId, userName, roomCode } = submitInfo;
      localStorage.setItem('userName', userName);
      localStorage.setItem('userId', userId);
      sessionStorage.setItem('roomCode', roomCode);
      navigate('/' + roomCode);
    });

    // Clean up the socket listener when the component unmounts
    return () => {
      socket.off('redirectToLobby');
    };
  }, [socket, navigate]);

  const handleSubmit = () => {
    const characters = 'ABCDEFGHIJKLMNPQRSTUVWXYZ0123456789'; // Exclude similar-looking characters
    let roomCode = '';
    for (let i = 0; i < 4; i++) {
      roomCode += characters.charAt(Math.floor(Math.random() * characters.length));
    }
    return roomCode;
  };

  return (
    <>
      <button className='closeButton' onClick={onClose}>X</button>
      <div className='modalDiv'>
        <Formik
          initialValues={{
            userName: '',
            roomCode: '',
            password: '',
          }}
          validationSchema={Yup.object({
            userName: Yup.string()
              .max(14, 'Must be 14 characters or less')
              .required('Required'),
            password: Yup.string()
              .max(10, 'Must be 10 characters or less'),
          })}
          onSubmit={async (values, { setSubmitting }) => {
            setSubmitting(false); // Disable form submission spinner
            let generateCodeLoop = true;

            if (socket) {
              try {
                while (generateCodeLoop) {
                  values.roomCode = handleSubmit(); // Generate a random room code
                  const response = await socket.emitWithAck('isRoomMade', values.roomCode); // Check if room exists

                  if (!response) { // If the room doesn't exist
                    generateCodeLoop = false;
                    const userId = localStorage.getItem('userId');
                    const submitInfo = {
                      userId,
                      userName: values.userName,
                      password: values.password,
                      roomCode: values.roomCode,
                    };
                    socket.emit('hostRoom', { ...submitInfo }); // Host the room
                  }
                }
              } catch (e) {
                console.error('Error:', e);
              }
            }
          }}
        >
          {formik => (
            <form className='formDiv' onSubmit={formik.handleSubmit}>
              <label htmlFor='userName'>Your Name</label>
              <input
                id='userName'
                type='text'
                {...formik.getFieldProps('userName')}
              />
              {formik.touched.userName && formik.errors.userName ? (<div>{formik.errors.userName}</div>) : null}

              <label htmlFor='password'>Password (optional)</label>
              <input
                id='password'
                type='password'
                {...formik.getFieldProps('password')}
              />
              {formik.touched.password && formik.errors.password ? (<div>{formik.errors.password}</div>) : null}

              <button type='submit'>Host Room</button>
            </form>
          )}
        </Formik>
      </div>
    </>
  );
};

export default HostModal;
