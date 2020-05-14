import {combineReducers} from 'redux';
import * as types from './action-types';

const originalInitialState = {
  rooms: {},
};

function reduce(state = originalInitialState, action = null) {
  switch (action.type) {
    case types.ON_ROOM_CHANGED:
      return { ...state, rooms: { [action.roomId]: action.data } };
    case types.SAVE_ROOM_ID:
      return { ...state, roomId: action.roomId };
    default:
      return state;
  }
}

export default combineReducers({
  reduce,
});
