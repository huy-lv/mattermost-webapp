// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {combineReducers} from 'redux';

import {ActionTypes} from 'utils/constants';

function modalState(state = {}, action) {
    switch (action.type) {
    case ActionTypes.MODAL_OPEN:
        return {
            ...state,
            [action.modalId]: {
                open: true,
                dialogProps: action.dialogProps,
                dialogType: action.dialogType,
            },
        };
    case ActionTypes.MODAL_CLOSE:
        return {
            ...state,
            [action.modalId]: {
                open: false,
                dialogProps: action.dialogProps,
                dialogType: action.dialogType,
            },
        };
    case ActionTypes.SHOW_HIDE_ALERT_DIALOG:
        return { ...state, alert: { ...action } };
    case ActionTypes.HIDE_ALERT_DIALOG:
        return { ...state, alert: { ...state.alert, visible: false } };
    case ActionTypes.SHOW_HIDE_LOADING_DIALOG:
        return { ...state, loading: { ...action } };
    default:
        return state;
    }
}

export default combineReducers({
    modalState,
});
