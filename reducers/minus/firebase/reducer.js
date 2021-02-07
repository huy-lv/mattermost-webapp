import {combineReducers} from 'redux';
import * as types from './action-types';

const originalInitialState = {
};

export default function firebaseDatabase(state = originalInitialState, action = null) {
  switch (action.type) {
    case types.SAVE_FIREBASE_USER_INFO:
      return { ...state, ...action.data };
    default:
      return state;
  }
}
