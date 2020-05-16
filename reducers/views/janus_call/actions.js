import firebase from 'firebase'
import moment from 'moment'

import Constants from 'utils/constants';
import { getAPIUrl } from 'utils/url';

import * as types from './action-types';

export const joinRoom = (onCreateRoomDone) => {
    return async (dispatch, getState) => {
        const { currentUserId, profiles } = getState().entities.users
        const roomPath = '/onFlight/getRoomID/' + currentUserId;
        const roomId = moment().valueOf();
        const { username } = profiles[currentUserId]
        const role = (await firebase.database().ref('mm_users/' + currentUserId).once('value')).role || Constants.USER_ROLE.STUDENT
        const photoURL = getAPIUrl() + '/users/' + currentUserId + '/image'

        //find room id by user id
        await firebase
            .database()
            .ref(roomPath)
            .set({ roomId, status: 'init' });

        const roomPathRef = firebase.database().ref(roomPath);
        const listener = roomPathRef.on('value', async (snapshot) => {
            const roomStatus = snapshot.val();
            if (roomStatus && roomStatus.status === 'ready') {
                //set to path
                await onJoinRoomSuccess(
                    dispatch,
                    roomId,
                    currentUserId,
                    username,
                    role,
                    photoURL
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
    username,
    role = Constants.USER_ROLE.STUDENT,
    photoURL
) {
    await firebase
        .database()
        .ref(`onFlight/rooms/${roomId}/users/${uid}`)
        .set({
            name: username,
            photoURL,
            role,
            transcription: false,
            translation: false,
        });

    //save room data to store
    firebase
        .database()
        .ref(`/onFlight/rooms/${roomId}`)
        .on('value', (snapshot) => {
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
        const { currentUserId } = getState().entities.users
        firebase
            .database()
            .ref(`/onFlight/rooms/${roomId}/users/${currentUserId}/janusId`)
            .set(id);
    };
}
