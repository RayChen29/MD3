
import React, { useState, useEffect } from 'react';
import { Formik } from 'formik';
import * as Yup from 'yup';
import io, { Socket } from 'socket.io-client';
import { useNavigate } from 'react-router-dom';

interface JoinModalProps {
  onClose: () => void;
}

const JoinModal: React.FC<JoinModalProps> = ({ onClose }) => {
  const [failCounter, setFailCounter] = useState(0);
  const [socket, setSocket] = useState<Socket | undefined>(undefined);
  const navigate = useNavigate();

  useEffect(() => {
    // Create the socket connection with autoConnect set to false
    const joinGameSocket = io('http://localhost:8080', { autoConnect: false });
    setSocket(joinGameSocket);

    // Add an event listener for the 'connect' event
    joinGameSocket.on('connect', () => {
      console.log('Join Game from React Side');
    });



// This doesn't exist btw.
    joinGameSocket.on('joinRoomResponse', (submitInfo) => {
      const { userId, userName, roomCode } = submitInfo;
      localStorage.setItem('userName', userName);
      localStorage.setItem('userId', userId);
      sessionStorage.setItem('roomCode', roomCode);
      joinGameSocket.disconnect();
      navigate('/' + roomCode);
    });

    // Clean up the socket connection on component unmount
    return () => {
      joinGameSocket.disconnect();
    };
  }, [navigate]);

  const handleFail = () => {
    setFailCounter(prevFailCounter => prevFailCounter + 1);
  };

  return (
    <div className='modalDiv'>
      <Formik
        initialValues={{
          userName: '',
          password: '',
          roomCode: '',
        }}
        validationSchema={Yup.object({
          userName: Yup.string()
            .max(14, 'Must be 14 characters or less')
            .required('We need a name from you!'),
          roomCode: Yup.string()
            .length(4, 'Room Code should be 4 characters exactly')
            .required('Need to have one of these codes.')
            .matches(/^[A-Z0-9]+$/, 'Alphanumerics Only.')
        })}
        onSubmit={async (values, { setSubmitting }) => {
          const userId = localStorage.getItem('userId');
          //...
          const submitInfo = {
            userId,
            userName: values.userName,
            password: values.password,
            roomCode: values.roomCode.toUpperCase(),
          };
          setSubmitting(false);

          if(socket){
            socket.connect();
            if(!userId == undefined)
            {
              const generatedUserId = await socket.emitWithAck('generateId');
              // userId = generatedUserId.userId;
              console.log
              submitInfo.userId = userId;
              localStorage.setItem('userId', generatedUserId.userId);
            }
              

            const tryToNav = await socket.emitWithAck('enterLink',submitInfo);      
            console.log(tryToNav.status);//failed for some reason
            console.log(tryToNav.roomCode);//undefined b/c never gets here.
            if(tryToNav.status === 'failed')
              handleFail();
            else
            {
              // localStorage.setItem('userName', tryToNav.userName); 
              // localStorage.setItem('userId', tryToNav.userId);//idk which userId should be used.
              // sessionStorage.setItem('roomCode', tryToNav.roomCode);
              // joinGameSocket.disconnect();//
              navigate(values.roomCode);
            }

              
          }
        }}
      >
        {formik => (
          <form className='formDiv' onSubmit={formik.handleSubmit}>
            <button className='closeButton' onClick={onClose}>X</button>
            <label htmlFor='userName'>Your Name</label>
            <input
              id='userName'
              type='text'
              {...formik.getFieldProps('userName')}
            />
            {formik.touched.userName && formik.errors.userName ? (<div>{formik.errors.userName}</div>) : null}
            <label htmlFor='roomCode'>Room Code</label>
            <input
              id='roomCode'
              type='text'
              {...formik.getFieldProps('roomCode')}
              onChange={e => {
                const { value } = e.target;
                formik.setFieldValue('roomCode', value.toUpperCase());
              }}
            />
            {formik.touched.roomCode && formik.errors.roomCode ? (<div>{formik.errors.roomCode}</div>) : null}
            <label htmlFor='password'>Room Password?</label>
            <input
              id='password'
              type='password'
              {...formik.getFieldProps('password')}
            />
            {formik.touched.password && formik.errors.password ? (<div>{formik.errors.password}</div>) : null}
            {/* <button type='submit'>Join Room</button> */}
            <button
              type='button'
              onClick={() => {
                formik.submitForm().catch(() => {
                  handleFail();
                });
              }}
            >
              Join Room
            </button>
            {/* TODO: implement failcounter */}
            {failCounter > 0 && `Could not join the room. Either full, wrong password, or doesn't exist (${failCounter})`}
          </form>
        )}
      </Formik>
    </div>
  );
};

export default JoinModal;
