import firebase from 'firebase'
import moment from 'moment'
import Constants from 'utils/constants';
import * as types from './action-types';

export const joinRoom = (onCreateRoomDone) => {
  return async (dispatch) => {
    let uid = 'ix5kguhyziggtqne99ux96zo3a';
    let roomPath = '/onFlight/getRoomID/' + uid;
    let roomId = moment().valueOf();
    let userName = 'huylv'
    let role = Constants.USER_ROLE.TEACHER

    //find room id by user id
    await firebase
      .database()
      .ref(roomPath)
      .set({ roomId, status: 'init' });

    let roomPathRef = firebase.database().ref(roomPath);
    let listener = roomPathRef.on('value', async snapshot => {
      let roomStatus = snapshot.val();
      if (roomStatus && roomStatus.status === 'ready') {
        //set to path
        await onJoinRoomSuccess(
          dispatch,
          roomId,
          uid,
          userName,
          role,
        );
        roomPathRef.off('value', listener);
        onCreateRoomDone(roomId);
      }
    });
  }
}


async function onJoinRoomSuccess(
  dispatch,
  roomId,
  uid,
  userName,
  role = Const.USER_ROLE.STUDENT,
  photoURL
) {
  await firebase
    .database()
    .ref(`onFlight/rooms/${roomId}/users/${uid}`)
    .set({
      name: userName,
      photoURL: 'photoURL',
      role,
      transcription: false,
      translation: false,
    });
  //save room data to store
  firebase
    .database()
    .ref(`/onFlight/rooms/${roomId}`)
    .on('value', snapshot => {
      dispatch({
        type: types.ON_ROOM_CHANGED,
        roomId,
        data: snapshot.val(),
      });
    });
  dispatch({
    type: types.SAVE_ROOM_ID,
    roomId,
  });
  await firebase
    .database()
    .ref(`presence/${uid}/inRoom`)
    .set(roomId);
}

export function saveJanusId(roomId, id) {
    return (dispatch, getState) => {
      //get current user id
    let uid = 'ix5kguhyziggtqne99ux96zo3a';
      firebase
        .database()
        .ref(`/onFlight/rooms/${roomId}/users/${uid}/janusId`)
        .set(id);
    };
  }
