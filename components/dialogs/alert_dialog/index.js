// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {connect} from 'react-redux';
import * as _ from 'lodash'

import AlertDialog from './alert_modal.jsx';
import { ActionTypes } from 'utils/constants.jsx';

function mapStateToProps(state) {
    return {
        message: _.get(state, 'views.modals.modalState.alert.message') || '',
        visible: _.get(state, 'views.modals.modalState.alert.visible') || false,
        title: _.get(state, 'views.modals.modalState.alert.title') || '',
        buttons: _.get(state, 'views.modals.modalState.alert.buttons') || []
    };
}

function mapDispatchToProps(dispatch) {
    return {
        hideDialog: () => dispatch({ type: ActionTypes.HIDE_ALERT_DIALOG })
    };
}

export default connect(mapStateToProps, mapDispatchToProps)(AlertDialog);
