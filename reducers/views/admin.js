// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {combineReducers} from 'redux';

import {ActionTypes} from 'utils/constants';

const initialState = {
    blocked: false,
    onNavigationConfirmed: null,
    showNavigationPrompt: false,
};

function navigationBlock(state = initialState, action) {
    switch (action.type) {
    case ActionTypes.SET_NAVIGATION_BLOCKED:
        return {...state, blocked: action.blocked};
    case ActionTypes.DEFER_NAVIGATION:
        return {
            ...state,
            onNavigationConfirmed: action.onNavigationConfirmed,
            showNavigationPrompt: true,
        };
    case ActionTypes.CANCEL_NAVIGATION:
        return {
            ...state,
            onNavigationConfirmed: null,
            showNavigationPrompt: false,
        };
    case ActionTypes.CONFIRM_NAVIGATION:
        return {
            ...state,
            blocked: false,
            onNavigationConfirmed: null,
            showNavigationPrompt: false,
        };
    case ActionTypes.SHOW_HIDE_ALERT_DIALOG:
        return { ...state, alert: { ...action } };
    case ActionTypes.HIDE_ALERT_DIALOG:
        return { ...state, alert: { ...state.alert, visible: false } };
    case ActionTypes.SHOW_HIDE_LOADING_DIALOG:
        return { ...state, loading: { ...action } };
    case ActionTypes.SERVER_STATUS_CHANGED:
        return { ...state, serverStatus: action.data };
    default:
        return state;
    }
}

export default combineReducers({
    navigationBlock,
});
