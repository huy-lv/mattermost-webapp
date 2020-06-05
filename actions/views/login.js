// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import * as UserActions from 'mattermost-redux/actions/users';
import firebase from 'firebase/app';
import 'firebase/auth';
import Client1 from 'mattermost-redux/client';
import AsiaService from 'services/AsiaService';
import { UserTypes } from 'mattermost-redux/action_types';

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
            await firebase.auth().signInWithPopup(googleProvider);
            let idToken = await firebase.auth().currentUser.getIdToken();
            let data = await AsiaService.loginWithGoogle(idToken)
            let { username, password } = data.data
            return ignoreMfaRequiredError(dispatch(UserActions.login(username, password, '')));
        } catch (error) {
            console.log('Error ', error);
        }
    };
}
