// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {connect} from 'react-redux';
import {bindActionCreators} from 'redux';

import {getConfig} from 'mattermost-redux/selectors/entities/general';

import {
    joinRoom,
    saveJanusId,
} from '../../reducers/views/janus_call/actions';

import JanusCall from './janus_call';

function mapStateToProps(state) {
    return {
        state
    };
}

function mapDispatchToProps(dispatch) {
    return {
        joinRoom: (onCreateRoomDone) => dispatch(joinRoom(onCreateRoomDone)),
        saveJanusId: (roomId, id) => dispatch(saveJanusId(roomId, id)),
    };
}

export default connect(mapStateToProps, mapDispatchToProps)(JanusCall);
