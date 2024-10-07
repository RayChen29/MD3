  import {Formik} from 'formik';
  import './HostModal.css';
  import * as Yup from 'yup';
  import React from 'react';
  import io from 'socket.io-client';
  import { useNavigate } from 'react-router-dom';
//

  interface HostModal {
      onClose: () => void; // Define the type of onClose prop
    }

  const HostModal: React.FC<HostModal> = ({onClose}) => {
    const navigate = useNavigate()
    const hostGameSocket = io('http://localhost:8080');//Remember to swap this out when deployment comes
//TODO?: set a useEffect for this, not sure what the dependency would be though.    
    hostGameSocket.on('connect', () =>{
      console.log('Connected from Client Side');
    });
//TODO?: set a useEffect for this, not sure what the dependency would be though. Might not need since not re-rendering with it
    hostGameSocket.on('redirectToLobby',(submitInfo) => { 
      const {userId, userName, roomCode } = submitInfo;
      //TODO: Redirect client to the game room with this data.
        localStorage.setItem("userName", userName);
        localStorage.setItem("userId", userId);
        //Session storage stuff should prob be going to a backend, but seems to work so far
        sessionStorage.setItem("roomCode",roomCode);
        hostGameSocket.disconnect();//Figuring that since we are leaving this page, we can just do this instead ofuseEffect?
        //Redirect to the room
        navigate('/'+roomCode);//How to correct this?
      })
      
      //Generates a random string to be used as a room code.
    const handleSubmit = () => {
      const characters = "ABCDEFGHIJKLMNPQRSTUVWXYZ0123456789";//REMINDER: toUpper in the join section.
      let roomCode = '';
      for(let i = 0; i < 4; i++) {
        roomCode += characters.charAt(Math.floor(Math.random() * characters.length));
      }
      return roomCode;
    }
    return(
      <>
      <button className='closeButton' onClick={onClose}>X</button>
      <div className='modalDiv'>
          <Formik
            initialValues={{    
              userName:'', 
              roomCode:'',
              password:'',
            }}
            validationSchema={Yup.object({
              userName: Yup.string()
              .max(14,'Must be 14 characters or less')
              .required('Required'),
              password: Yup.string()
              .max(10,'Must be 10 characters or less')
            })}
            onSubmit={async (values,{setSubmitting}) => { 
              setSubmitting(false); //I think don't need setSubmitting, but don't want things to break yet.
              let generateCodeLoop = true;//Generates a working room code as long as needed

              try {
                while(generateCodeLoop == true)
                  {
                    values.roomCode = handleSubmit();//generates a random code to use
                    const response = await hostGameSocket.emitWithAck("isRoomMade",values.roomCode);//Is it made?
                    // if(response == true)
                    if(response == false) //Do this stuff if room wasn't made, kill loop.
                    {
                      generateCodeLoop = false; 
                      const userId = localStorage.getItem('userId');
                      const submitInfo = {
                        userId: userId,
                        userName: values.userName,
                        password:values.password,
                        roomCode: values.roomCode,
                      }
                      hostGameSocket.emit("hostRoom",{...submitInfo});
                    }
                  }
              }
              catch(e) {
                console.error('Error:',e);
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
                {formik.touched.userName && formik.errors.userName ? (<div>{formik.errors.userName}</div>):null}
                <label htmlFor='password'>Password(optional)</label>
                <input
                  id='password'
                  type='password'
                  {...formik.getFieldProps('password')}
                />
                {formik.touched.password && formik.errors.password ? (<div>{formik.errors.password}</div>):null}    
                <button type='submit'>Host Room</button>      
              </form>
            )}
          </Formik>

          </div>
      </>
    );
  };

  export default HostModal;