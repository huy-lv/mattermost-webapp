// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {connect} from 'react-redux';
import {bindActionCreators} from 'redux';
import * as _ from 'lodash'

import LoadingModal from './loading_modal.jsx';

function mapStateToProps(state) {
    return {
        message: _.get(state, 'views.modals.modalState.loading.message') || '',
        visible: _.get(state, 'views.modals.modalState.loading.visible') || false,
        title: _.get(state, 'views.modals.modalState.loading.title') || '',
    };
}

function mapDispatchToProps(dispatch) {
    return {
    };
}

export default connect(mapStateToProps, mapDispatchToProps)(LoadingModal);
