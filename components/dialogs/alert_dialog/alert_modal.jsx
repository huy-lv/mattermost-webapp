import * as React from "react";
import Dialog from "@material-ui/core/Dialog";
import DialogActions from "@material-ui/core/DialogActions";
import DialogContent from "@material-ui/core/DialogContent";
import DialogContentText from "@material-ui/core/DialogContentText";
import DialogTitle from "@material-ui/core/DialogTitle";
import Slide from "@material-ui/core/Slide";
import Button from "@material-ui/core/Button";

export const Transition = React.forwardRef((props, ref) => (
  <Slide direction="up" {...props} ref={ref} />
));

export default class AlertDialog extends React.Component {
  renderButtons = () => {
    let { buttons, hideDialog } = this.props;
    if (buttons.length > 0) {
      return (
        <DialogActions>
          {buttons.map((item, index) => {
            return (
              <Button
                onClick={() => {
                  hideDialog();
                  item.onPress && item.onPress();
                }}
                color="primary"
                key={index}
              >
                {item.text}
              </Button>
            );
          })}
        </DialogActions>
      );
    } else {
      return (
        <DialogActions>
          <Button onClick={hideDialog} color="primary">
            OK
          </Button>
        </DialogActions>
      );
    }
  };

  render() {
    let { title, message, visible, hideDialog } = this.props;

    return (
      <Dialog
        open={visible}
        TransitionComponent={Transition}
        keepMounted
        maxWidth="sm"
        onClose={hideDialog}
        aria-labelledby="alert-dialog-slide-title"
        aria-describedby="alert-dialog-slide-description"
      >
        <DialogTitle id="alert-dialog-slide-title">{title}</DialogTitle>
        <DialogContent>
          <DialogContentText id="alert-dialog-slide-description">
            {message}
          </DialogContentText>
        </DialogContent>
        {this.renderButtons()}
      </Dialog>
    );
  }
}
