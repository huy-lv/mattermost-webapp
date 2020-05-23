// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import * as UserActions from 'mattermost-redux/actions/users';
import firebase from 'firebase/app';
import 'firebase/auth';
import Client4 from 'mattermost-redux/client/client4';
import AsiaService from 'services/AsiaService';

export function login(loginId, password, mfaToken) {
    return (dispatch) => {
        return ignoreMfaRequiredError(dispatch(UserActions.login(loginId, password, mfaToken)));
    };
}

export function loginById(userId, password, mfaToken) {
    return (dispatch) => {
        return ignoreMfaRequiredError(dispatch(UserActions.loginById(userId, password, mfaToken)));
    };
}

async function ignoreMfaRequiredError(promise) {
    let result = await promise;

    if (result.error && result.error.server_error_id === 'api.context.mfa_required.app_error') {
        result = { data: true };
    }

    return result;
}

export function loginWithGoogle() {
    return async (dispatch) => {
        const googleProvider = new firebase.auth.GoogleAuthProvider();
        googleProvider.addScope('profile');

        try {
            const result = await firebase.auth().signInWithPopup(googleProvider);
            const { accessToken } = result.credential;
            const user = result.user;
            const userInfo = {
                uid: user.uid,
                displayName: user.displayName,
                photoURL: user.photoURL,
                email: user.email,
            };
            let idToken = await firebase.auth().currentUser.getIdToken();

            let body = { idToken };
            let response = await AsiaService.loginWithGoogle(idToken)

            console.log('idtoken: ' + response)
            // dispatch({ type: 'LOGIN_WITH_GOOGLE_SUCCESS', payload: { idToken, accessToken, userInfo } });
        } catch (error) {
            console.log('Error ', error);
        }
    };
}
