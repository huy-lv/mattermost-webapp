// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {connect} from 'react-redux';
import {bindActionCreators} from 'redux';

import {
    joinRoom,
    saveJanusId,
    toggleTranscription,
    toggleTranslation,
    joinRoomById
} from '../../reducers/views/janus_call/actions';
import {
    showHideLoadingDialog,
    showHideAlertDialog
} from 'actions/views/modals';

import JanusCall from './janus_call';

function mapStateToProps(state) {
    const { currentUserId, profiles } = state.entities.users
    const { username } = profiles[currentUserId]
    const { rooms, roomId } = state.views.janusCall
    return {
        currentUserId,
        username,
        rooms,
        roomId
    };
}

function mapDispatchToProps(dispatch) {
    return {
        actions: bindActionCreators({
            showHideLoadingDialog,
            showHideAlertDialog,
            toggleTranscription,
            toggleTranslation,
            saveJanusId,
            joinRoom,
            joinRoomById
        }, dispatch),
    };
}

export default connect(mapStateToProps, mapDispatchToProps)(JanusCall);
