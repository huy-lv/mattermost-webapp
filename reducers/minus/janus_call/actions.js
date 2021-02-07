import firebase from 'firebase';
import moment from 'moment';

import Constants from 'utils/constants';
import { getAPIUrl, getServerURL } from 'utils/url';

import * as types from './action-types';
import Axios from 'axios';

export function joinRoom(onCreateRoomDone) {
    return async (dispatch, getState) => {
        const { firebaseId, profile, role } = getState().minus.firebaseDatabase;
        const roomPath = '/onFlight/getRoomID/' + firebaseId;
        const roomId = moment().valueOf();
        const { photoURL, email } = profile;
        let username = email.split('@')[0];

        //find room id by user id
        await firebase.database().ref(roomPath).set({ roomId, status: 'init' });

        const roomPathRef = firebase.database().ref(roomPath);
        const listener = roomPathRef.on('value', async (snapshot) => {
            const roomStatus = snapshot.val();
            if (roomStatus && roomStatus.status === 'ready') {
                //set to path
                await onJoinRoomSuccess(dispatch, roomId, firebaseId, username, role, photoURL);
                roomPathRef.off('value', listener);
                onCreateRoomDone(roomId);
            }
        });
    };
}

export function joinRoomById(roomId, onCreateRoomDone) {
    return async (dispatch, getState) => {
        const { firebaseId, profile, role } = getState().minus.firebaseDatabase;
        const { username, photoURL } = profile;

        if (await isRoomAvailable(roomId)) {
            await firebase
                .database()
                .ref('onFlight/getRoomID/' + firebaseId)
                .set({
                    roomId,
                    status: 'ready',
                });
            await onJoinRoomSuccess(dispatch, roomId, firebaseId, username, role, photoURL);
            onCreateRoomDone(roomId);
        } else {
            onCreateRoomDone(null);
        }
    };
}

async function isRoomAvailable(roomId) {
    let roomSnapshot = await firebase
        .database()
        .ref('/onFlight/rooms/' + roomId)
        .once('value');
    return roomSnapshot.val() !== null;
}

async function onJoinRoomSuccess(dispatch, roomId, uid, username, role = Constants.USER_ROLE.STUDENT, photoURL) {
    await firebase.database().ref(`onFlight/rooms/${roomId}/users/${uid}`).set({
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
    await firebase.database().ref(`presence/${uid}/inRoom`).set(roomId);
}

export function saveJanusId(roomId, id) {
    return (dispatch, getState) => {
        const { firebaseId } = getState().minus.firebaseDatabase;
        firebase.database().ref(`/onFlight/rooms/${roomId}/users/${firebaseId}/janusId`).set(id);
    };
}

export function toggleTranscription(roomId, value) {
    return (dispatch, getState) => {
        const { firebaseId } = getState().minus.firebaseDatabase;
        firebase.database().ref(`/onFlight/rooms/${roomId}/users/${firebaseId}/transcription`).set(value);
    };
}

export function toggleTranslation(roomId, value) {
    return (dispatch, getState) => {
        const { firebaseId } = getState().minus.firebaseDatabase;
        firebase.database().ref(`/onFlight/rooms/${roomId}/users/${firebaseId}/translation`).set(value);
    };
}

export async function leaveRoom(roomId, uid) {
    let roomPath = `onFlight/getRoomID/${uid}`;
    //set to path
    await firebase.database().ref(roomPath).remove();
    await firebase.database().ref(`onFlight/rooms/${roomId}/users/${uid}`).remove();
}

export function sendInviteToChat(roomId, channelId) {
    return async () => {
        //send http request to plugin server side
        let url = getServerURL() + '/plugins/januss/api/v1/meetings';
        let headers = { 'X-Requested-With': 'XMLHttpRequest', 'Content-Type': 'application/json', Accept: 'application/json' };

        try {
            let response = await Axios({
                method: 'post',
                url,
                data: {
                    channel_id: channelId,
                    meeting_id: roomId,
                },
                headers,
                withCredentials: true,
            });
            return response.body;
        } catch (err) {
            console.log(err);
        }
    };
}
