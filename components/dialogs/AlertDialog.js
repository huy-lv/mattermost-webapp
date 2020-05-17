import * as React from "react";
import { connect } from "react-redux";
import Dialog from "@material-ui/core/Dialog";
import DialogActions from "@material-ui/core/DialogActions";
import DialogContent from "@material-ui/core/DialogContent";
import DialogContentText from "@material-ui/core/DialogContentText";
import DialogTitle from "@material-ui/core/DialogTitle";
import Slide from "@material-ui/core/Slide";
import Button from "@material-ui/core/Button";

import * as configActionType from "../../stores/config/action-types";

export const Transition = React.forwardRef((props, ref) => (
  <Slide direction="up" {...props} ref={ref} />
));

class AlertDialog extends React.Component {
  renderButtons = () => {
    let { buttons } = this.props;
    if (buttons) {
      return (
        <DialogActions>
          {buttons.map((item, index) => {
            return (
              <Button
                onClick={() => {
                  this.props.hideDialog();
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
          <Button onClick={this.props.hideDialog} color="primary">
            OK
          </Button>
        </DialogActions>
      );
    }
  };

  render() {
    let { title, message, visible } = this.props;

    return (
      <Dialog
        open={visible}
        TransitionComponent={Transition}
        keepMounted
        maxWidth="sm"
        onClose={this.props.hideDialog}
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

function mapStateToProps(state) {
  return {
    title: state.config.alert ? state.config.alert.title : "",
    message: state.config.alert ? state.config.alert.message : "",
    visible: state.config.alert ? state.config.alert.visible : false,
    buttons: state.config.alert ? state.config.alert.buttons : []
  };
}

function mapDispatchToProps(dispatch) {
  return {
    hideDialog: () => dispatch({ type: configActionType.HIDE_ALERT_DIALOG })
  };
}
export default connect(mapStateToProps, mapDispatchToProps)(AlertDialog);
