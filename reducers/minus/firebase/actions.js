import * as types from './action-types';
import firebase from 'firebase'

export function loadMeFirebase() {
    return (dispatch) => {
        firebase.auth().onAuthStateChanged(async (user) => {
            if (user) {
                let firebaseId = user.uid
                let currentUser = (await firebase.database().ref("users/" + user.uid)
                                .once("value")).val()
                dispatch({
                    type: types.SAVE_FIREBASE_USER_INFO,
                    data: {
                        firebaseId,
                        ...currentUser
                    },
                });
            }
          });
    };
}