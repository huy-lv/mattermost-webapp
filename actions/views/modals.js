// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {ActionTypes} from 'utils/constants';

export function openModal(modalData) {
    return (dispatch) => {
        const action = {
            type: ActionTypes.MODAL_OPEN,
            modalId: modalData.modalId,
            dialogProps: modalData.dialogProps,
            dialogType: modalData.dialogType,
        };

        dispatch(action);
        return {data: true};
    };
}

export function closeModal(modalId) {
    return (dispatch) => {
        const action = {
            type: ActionTypes.MODAL_CLOSE,
            modalId,
        };

        dispatch(action);
        return {data: true};
    };
}

export function showHideAlertDialog(visible, message, title, buttons) {
    return (dispatch) => {
        dispatch({
            type: ActionTypes.SHOW_HIDE_ALERT_DIALOG,
            visible,
            title: title || 'Alert',
            message,
            buttons,
        })
    }
}

export function showHideLoadingDialog(visible, message, title) {
    return (dispatch) => {
        dispatch({
            type: ActionTypes.SHOW_HIDE_LOADING_DIALOG,
            visible,
            message,
            title,
        })
    }
}
