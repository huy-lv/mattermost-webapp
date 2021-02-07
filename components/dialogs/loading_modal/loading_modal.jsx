import * as React from 'react';
import PropTypes from 'prop-types';
import Dialog from '@material-ui/core/Dialog';
import DialogContent from '@material-ui/core/DialogContent';
import DialogContentText from '@material-ui/core/DialogContentText';
import Slide from '@material-ui/core/Slide';
import withStyles from '@material-ui/core/styles/withStyles';
import Grid from '@material-ui/core/Grid';

// import * as configActionType from "../../stores/config/action-types";
import { CircularProgress, DialogTitle } from '@material-ui/core';

export const Transition = React.forwardRef((props, ref) => (
    <Slide direction="up" {...props} ref={ref} />
));

class LoadingModal extends React.Component {
    static propTypes = {
        message: PropTypes.string,
        title: PropTypes.string,
        visible: PropTypes.bool.isRequired,
    }

    static defaultProps = {
        message: '',
        title: '',
        visible: false,
    };

    render() {
        let { message, visible, classes, title } = this.props;
        return (
            <Dialog
                open={visible}
                TransitionComponent={Transition}
                keepMounted
                maxWidth="sm"
                disableBackdropClick
                onClose={this.props.hideDialog}
                aria-labelledby="alert-dialog-slide-title"
                aria-describedby="alert-dialog-slide-description"
            >
                <DialogContent className={classes.center}>
                    <DialogTitle>{title}</DialogTitle>
                    <Grid container justify="center" className={classes.circularProgress}>
                        <CircularProgress />
                    </Grid>
                    <DialogContentText id="alert-dialog-slide-description">
                        {message || 'Loading...'}
                    </DialogContentText>
                </DialogContent>
            </Dialog>
        );
    }
}

const style = (theme) => ({
    center: {
        justifyContent: 'center',
        alignItems: 'center',
    },
    circularProgress: {
        padding: theme.spacing(3),
        justifyContent: 'center',
        alignItems: 'center',
    },
});

export default withStyles(style)(LoadingModal)
