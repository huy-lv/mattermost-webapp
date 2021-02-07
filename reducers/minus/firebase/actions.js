import * as types from './action-types';
import firebase from 'firebase';

export function loadMeFirebase() {
    return async (dispatch, getState) => {
        let { currentUserId, profiles } = getState().entities.users;
        if (currentUserId && profiles) {
            let { email } = profiles[currentUserId];
            let snap = await firebase.database().ref('users').orderByChild('profile/email').equalTo(email).once('value');
            let firebaseUser = snap.val();
            let firebaseId = Object.keys(firebaseUser)[0];
            dispatch({
                type: types.SAVE_FIREBASE_USER_INFO,
                data: {
                    firebaseId,
                    ...firebaseUser[firebaseId],
                },
            });
        }
    };
}
