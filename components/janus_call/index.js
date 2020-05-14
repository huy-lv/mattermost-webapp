// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {connect} from 'react-redux';
import {bindActionCreators} from 'redux';

import {getConfig} from 'mattermost-redux/selectors/entities/general';

import JanusCall from './janus_call';
import {
  joinRoom,
} from '../../reducers/views/janus_call/actions';

function mapStateToProps(state) {
    return {
        state: state
    };
}

function mapDispatchToProps(dispatch) {
    return {
        joinRoom: (onCreateRoomDone) => dispatch(joinRoom(onCreateRoomDone)),
    };
}

export default connect(mapStateToProps, mapDispatchToProps)(JanusCall);