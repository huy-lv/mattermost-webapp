// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {combineReducers} from 'redux';

import firebaseDatabase from './firebase/reducer'
import janusCall from './janus_call/reducer'

export default combineReducers({
    firebaseDatabase,
    janusCall,
});
