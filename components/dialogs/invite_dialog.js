import React, { ComponentType, useState } from 'react';
import Dialog from '@material-ui/core/Dialog';
import DialogActions from '@material-ui/core/DialogActions';
import DialogContent from '@material-ui/core/DialogContent';
import DialogTitle from '@material-ui/core/DialogTitle';
import Slide from '@material-ui/core/Slide';
import Button from '@material-ui/core/Button';

import { TransitionProps } from '@material-ui/core/transitions/transition';
// import FriendList from '../FriendList';

const Transition = React.forwardRef<unknown, TransitionProps>((props, ref) => (
  <Slide direction="up" ref={ref} {...props} />
));

interface Props {
  visible: boolean;
  onClose: () => void;
  onPressInvite: (name: string) => void;
}

const InviteDialog: React.FC<Props> = ({ visible, onClose, onPressInvite }) => {
  const [username, setUsername] = useState('');

  return (
    <Dialog
      open={visible}
      TransitionComponent={Transition}
      keepMounted
      maxWidth="sm"
      fullWidth
      onClose={onClose}
      aria-labelledby="alert-dialog-slide-title"
      aria-describedby="alert-dialog-slide-description"
      // PaperProps={{ style: { overflow: 'visible' } }}
    >
      <DialogTitle id="alert-dialog-slide-title">Invite</DialogTitle>
      <DialogContent>
        {/* <FriendList onClose={onClose} /> */}
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} color="primary">
          Close
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default InviteDialog;
