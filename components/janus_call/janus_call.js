// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import PropTypes from 'prop-types';
import React, {useState, useEffect} from 'react';
import {FormattedMessage} from 'react-intl';

import {memoizeResult} from 'mattermost-redux/utils/helpers';

import 'bootstrap';
import { Typography, Grid } from '@material-ui/core';
import Card from '@material-ui/core/Card';
import { makeStyles } from '@material-ui/core/styles';
import GridList from '@material-ui/core/GridList';
import GridListTile from '@material-ui/core/GridListTile';
import GridListTileBar from '@material-ui/core/GridListTileBar';
import IconButton from '@material-ui/core/IconButton';
import List from '@material-ui/core/List';
import TextField from '@material-ui/core/TextField';
import Send from '@material-ui/icons/SendRounded';
import FormControlLabel from '@material-ui/core/FormControlLabel';
import Button from '@material-ui/core/Button';
import ScrollToBottom from 'react-scroll-to-bottom';
import Switch from '@material-ui/core/Switch';

import {formatText} from 'utils/text_formatting';
import messageHtmlToComponent from 'utils/message_html_to_component';
import {browserHistory} from 'utils/browser_history';
import WarningIcon from 'components/widgets/icons/fa_warning_icon';
import LogoutIcon from 'components/widgets/icons/fa_logout_icon';
import LoadingSpinner from 'components/widgets/loading/loading_spinner';
import LoadingScreen from 'components/loading_screen';
import AnnouncementBar from 'components/announcement_bar';
import * as GlobalActions from 'actions/global_actions.jsx';
import Janus from 'janus/janus.js';
import {Constants} from 'utils/constants';

import * as strings from '../../utils/strings';
import * as Utils from '../../utils/Util';
import InviteDialog from '../dialogs/invite_dialog';

let publish = true;
const remoteList = [0, 1, 2, 3, 4];
const hosting = 'teachild.ga';
let server = null;
if (window.location.protocol === 'http:') {
    server = `http://${hosting}:8088/janus`;
} else {
    server = `https://${hosting}/janus`;
}
let janus = null;
let sfutest = null;
const opaqueId = 'videoroomtest-' + Utils.randomString(12);
let roomId = 0; // Demo room
let myusername = null;
let myid = null;
let mystream = null;

// We use this other ID just to map our subscriptions to us
let mypvtid = null;
const feeds = [];
const bitrateTimer = [];
const doSimulcast =
  Utils.getQueryStringValue('simulcast') === 'yes' ||
  Utils.getQueryStringValue('simulcast') === 'true';
const doSimulcast2 =
  Utils.getQueryStringValue('simulcast2') === 'yes' ||
  Utils.getQueryStringValue('simulcast2') === 'true';

// Detect tab close: make sure we don't loose existing onbeforeunload handlers
// (note: for iOS we need to subscribe to a different event, 'pagehide', see
// https://gist.github.com/thehunmonkgroup/6bee8941a49b86be31a787fe8f4b8cfe)
const messageList = [];
let varIsInCall = false;
const iOS = ['iPad', 'iPhone', 'iPod'].indexOf(navigator.platform) >= 0;
const eventName = iOS ? 'pagehide' : 'beforeunload';

function CallScreen(props) {
    const [isInCall, setIsInCall] = useState(false);
    const [message, setMessage] = useState('');
    const [temp, setTemp] = useState([]);
    const [disableTranscriptionSwitch, setDisableTranscriptionSwitch] = useState(
        false
    );
    const [disableTranslationSwitch, setDisableTranslationSwitch] = useState(
        false
    );
    const [timerRunning, setTimerRunning] = useState(false);
    const [inviteDialogVisible, setInviteDialogVisible] = useState(false);

    useEffect(() => {
        // componentdidmount
        if (props.location.pathname) {
            const paths = props.location.pathname.split('/')
            if(paths.length > 2 && parseInt(paths[2])) {
                props.actions.joinRoomById(parseInt(paths[2]), joinRoomSuccessWithRoomId);
            }
        }

        // beforeunload event
        window.addEventListener(eventName, requestLeaveRoom);
    }, []);

    const closeWindow = () => {
        window.close()
    }

    const joinRoomSuccessWithRoomId = (newRoomId) => {
        if (newRoomId === null) {
            props.actions.showHideAlertDialog(true, strings.room_not_available, null,
                [{text: 'OK', onPress: closeWindow}]);
            return;
        }
        props.history.push('/call/' + newRoomId)
        roomId = newRoomId;
        Janus.init({
            debug: 'all',
            callback() {
            // Make sure the browser supports WebRTC
                if (!Janus.isWebrtcSupported()) {
                    props.actions.showHideAlertDialog(true, 'No WebRTC support... ');
                    return;
                }

                // Create session
                janus = new Janus({
                    server,
                    iceServers: [
                        {
                            urls: `turn:${hosting}:3478`,
                            username: 'test',
                            credential: 'test',
                        },
                        { urls: `stun:${hosting}:3478` },
                    ],

                    success() {
                        // Attach to video room test plugin
                        janus.attach({
                            plugin: 'janus.plugin.videoroom',
                            opaqueId,
                            success(pluginHandle) {
                                sfutest = pluginHandle;
                                Janus.log(
                                    'Plugin attached! (' +
                        sfutest.getPlugin() +
                        ', id=' +
                        sfutest.getId() +
                        ')'
                                );
                                Janus.log(
                                    '  -- This is a publisher/manager with room Id ' + roomId
                                );
                                registerUsername();
                                setIsInCall(true);
                                varIsInCall = true;
                            },
                            error(error) {
                                Janus.error('  -- Error attaching plugin...', error);
                                props.actions.showHideAlertDialog(
                                    true,
                                    'Error attaching plugin... ' + error
                                );
                            },
                            consentDialog(on) {
                                Janus.debug(
                                    'Consent dialog should be ' + (on ? 'on' : 'off') + ' now'
                                );
                                if (on) {
                                    // Darken screen and show hint
                                    props.actions.showHideLoadingDialog(true, 'loadingg');
                                } else {
                                    // Restore screen
                                    props.actions.showHideLoadingDialog(false);
                                }
                            },
                            mediaState(medium, on) {
                                Janus.log(
                                    'Janus ' +
                        (on ? 'started' : 'stopped') +
                        ' receiving our ' +
                        medium
                                );
                            },
                            webrtcState(on) {
                                Janus.log(
                                    'Janus says our WebRTC PeerConnection is ' +
                        (on ? 'up' : 'down') +
                        ' now'
                                );
                                $('#videolocal')
                                    .parent()
                                    .parent()
                                    .unblock();
                                if (!on) {
                                    return;
                                }
                                $('#publish').remove();

                                // This controls allows us to override the global room bitrate cap
                                $('#bitrate')
                                    .parent()
                                    .parent()
                                    .removeClass('hide')
                                    .show();
                                $('#bitrate a').click(function() {
                                    const id = $(this).attr('id');
                                    const bitrate = parseInt(id) * 1000;
                                    if (bitrate === 0) {
                                        Janus.log('Not limiting bandwidth via REMB');
                                    } else {
                                        Janus.log('Capping bandwidth to ' + bitrate + ' via REMB');
                                    }
                                    $('#bitrateset')
                                        .html($(this).html() + '<span class="caret"></span>')
                                        .parent()
                                        .removeClass('open');
                                    sfutest.send({
                                        message: { request: 'configure', bitrate },
                                    });
                                    return false;
                                });
                            },
                            onmessage(msg, jsep) {
                                Janus.debug(' ::: Got a message (publisher) :::');
                                Janus.debug(msg);
                                const event = msg.videoroom;
                                Janus.debug('Event: ' + event);
                                if (event !== undefined && event !== null) {
                                    if (event === 'joined') {
                                        // Publisher/manager created, negotiate WebRTC and attach to existing feeds, if any
                                        myid = msg.id;
                                        mypvtid = msg.private_id;
                                        Janus.log(
                                            'Successfully joined room ' +
                            msg.room +
                            ' with ID ' +
                            myid
                                        );
                                        props.actions.saveJanusId(roomId, myid);
                                        publishOwnFeed(true);

                                        // Any new feed to attach to?
                                        if (
                                            msg.publishers !== undefined &&
                          msg.publishers !== null
                                        ) {
                                            const list = msg.publishers;
                                            Janus.debug('Got a list of available publishers/feeds:');
                                            Janus.debug(list);
                                            for (const f in list) {
                                                const id = list[f].id;
                                                const display = list[f].display;
                                                const audio = list[f].audio_codec;
                                                const video = list[f].video_codec;
                                                Janus.debug(
                                                    '  >> [' +
                                id +
                                '] ' +
                                display +
                                ' (audio: ' +
                                audio +
                                ', video: ' +
                                video +
                                ')'
                                                );
                                                newRemoteFeed(id, display, audio, video);
                                            }
                                        }
                                    } else if (event === 'destroyed') {
                                        // The room has been destroyed
                                        Janus.warn('The room has been destroyed!');
                                        props.actions.showHideAlertDialog(
                                            true,
                                            'The room has been destroyed',
                                            '',
                                            [
                                                {
                                                    text: strings.ok,
                                                    onPress: () => window.location.reload(),
                                                },
                                            ]
                                        );
                                    } else if (event === 'event') {
                                        // Any new feed to attach to?
                                        if (
                                            msg.publishers !== undefined &&
                          msg.publishers !== null
                                        ) {
                                            const list = msg.publishers;
                                            Janus.debug('Got a list of available publishers/feeds:');
                                            Janus.debug(list);
                                            for (const f in list) {
                                                const id = list[f].id;
                                                const display = list[f].display;
                                                const audio = list[f].audio_codec;
                                                const video = list[f].video_codec;
                                                Janus.debug(
                                                    '  >> [' +
                                id +
                                '] ' +
                                display +
                                ' (audio: ' +
                                audio +
                                ', video: ' +
                                video +
                                ')'
                                                );
                                                newRemoteFeed(id, display, audio, video);
                                            }
                                        } else if (
                                            msg.leaving !== undefined &&
                          msg.leaving !== null
                                        ) {
                                            // One of the publishers has gone away?
                                            const leaving = msg.leaving;
                                            Janus.log('Publisher left: ' + leaving);
                                            let remoteFeed = null;
                                            for (let i = 1; i < 6; i++) {
                                                if (
                                                    feeds[i] !== null &&
                              feeds[i] !== undefined &&
                              feeds[i].rfid === leaving
                                                ) {
                                                    remoteFeed = feeds[i];
                                                    break;
                                                }
                                            }
                                            if (remoteFeed !== null) {
                                                Janus.debug(
                                                    'Feed ' +
                                remoteFeed.rfid +
                                ' (' +
                                remoteFeed.rfdisplay +
                                ') has left the room, detaching'
                                                );
                                                $('#remote' + remoteFeed.rfindex)
                                                    .empty()
                                                    .hide();
                                                $('#videoremote' + remoteFeed.rfindex).empty();
                                                feeds[remoteFeed.rfindex] = null;
                                                remoteFeed.detach();
                                            }
                                        } else if (
                                            msg.unpublished !== undefined &&
                          msg.unpublished !== null
                                        ) {
                                            // One of the publishers has unpublished?
                                            const unpublished = msg.unpublished;
                                            Janus.log('Publisher left: ' + unpublished);
                                            if (unpublished === 'ok') {
                                                // That's us
                                                sfutest.hangup();
                                                return;
                                            }
                                            let remoteFeed = null;
                                            for (let i = 1; i < 6; i++) {
                                                if (
                                                    feeds[i] !== null &&
                              feeds[i] !== undefined &&
                              feeds[i].rfid === unpublished
                                                ) {
                                                    remoteFeed = feeds[i];
                                                    break;
                                                }
                                            }
                                            if (remoteFeed !== null) {
                                                Janus.debug(
                                                    'Feed ' +
                                remoteFeed.rfid +
                                ' (' +
                                remoteFeed.rfdisplay +
                                ') has left the room, detaching'
                                                );
                                                $('#remote' + remoteFeed.rfindex)
                                                    .empty()
                                                    .hide();
                                                $('#videoremote' + remoteFeed.rfindex).empty();
                                                feeds[remoteFeed.rfindex] = null;
                                                remoteFeed.detach();
                                            }
                                        } else if (
                                            msg.error !== undefined &&
                          msg.error !== null
                                        ) {
                                            if (msg.error_code === 426) {
                                                // This is a "no such room" error: give a more meaningful description
                                                props.actions.showHideAlertDialog(
                                                    true,
                                                    strings.room_not_available
                                                );
                                                props.history.goBack();
                                            } else {
                                                props.actions.showHideAlertDialog(true, msg.error);
                                            }
                                        }
                                    }
                                }
                                if (jsep !== undefined && jsep !== null) {
                                    Janus.debug('Handling SDP as well...');
                                    Janus.debug(jsep);
                                    sfutest.handleRemoteJsep({ jsep });

                                    // Check if any of the media we wanted to publish has
                                    // been rejected (e.g., wrong or unsupported codec)
                                    const audio = msg.audio_codec;
                                    if (
                                        mystream &&
                        mystream.getAudioTracks() &&
                        mystream.getAudioTracks().length > 0 &&
                        !audio
                                    ) {
                                        // Audio has been rejected
                                        props.enqueueSnackbar(
                                            "Our audio stream has been rejected, viewers won't hear us"
                                        );
                                    }
                                    const video = msg.video_codec;
                                    if (
                                        mystream &&
                        mystream.getVideoTracks() &&
                        mystream.getVideoTracks().length > 0 &&
                        !video
                                    ) {
                                        // Video has been rejected
                                        props.enqueueSnackbar(
                                            "Our video stream has been rejected, viewers won't see us"
                                        );

                                        // Hide the webcam video
                                        $('#myvideo').hide();
                                        $('#videolocal').append(
                                            '<div class="no-video-container">' +
                            '<i class="fa fa-video-camera fa-5 no-video-icon" style="height: 100%;"></i>' +
                            '<span class="no-video-text" style="font-size: 16px;">Video rejected, no webcam</span>' +
                            '</div>'
                                        );
                                    }
                                }
                            },
                            onlocalstream(stream) {
                                Janus.debug(' ::: Got a local stream :::');
                                mystream = stream;
                                Janus.debug(stream);
                                $('#videojoin').hide();
                                $('#videos')
                                    .removeClass('hide')
                                    .show();
                                if ($('#myvideo').length === 0) {
                                    $('#videolocal').append(
                                        '<video class="rounded centered" id="myvideo" width="100%" height="100%" autoplay playsinline muted="muted"/>'
                                    );

                                    // Add a 'mute' button
                                    $('#videolocal').append(
                                        '<button class="btn btn-warning btn-xs" id="mute" style="position: absolute; bottom: 0px; left: 0px; margin: 15px;">Mute</button>'
                                    );
                                    $('#mute').click(toggleMute);

                                    // Add an 'unpublish' button
                                    $('#videolocal').append(
                                        '<i class="fas fa-video" id="unpublish" style="position: absolute; bottom: 0px; right: 0px; margin: 15px; font-size:24px; color: #3f51b5;"/>'
                                    );
                                    $('#unpublish').click(unpublishOwnFeed);
                                }
                                $('#publisher')
                                    .removeClass('hide')
                                    .html(myusername)
                                    .show();
                                Janus.attachMediaStream($('#myvideo').get(0), stream);
                                $('#myvideo').get(0).muted = 'muted';
                                if (
                                    sfutest.webrtcStuff.pc.iceConnectionState !== 'completed' &&
                      sfutest.webrtcStuff.pc.iceConnectionState !== 'connected'
                                ) {
                                    $('#videolocal')
                                        .parent()
                                        .parent()
                                        .block({
                                            message: '<b>Publishing...</b>',
                                            css: {
                                                border: 'none',
                                                backgroundColor: 'transparent',
                                                color: 'white',
                                            },
                                        });
                                }
                                const videoTracks = stream.getVideoTracks();
                                if (
                                    videoTracks === null ||
                      videoTracks === undefined ||
                      videoTracks.length === 0
                                ) {
                                    // No webcam
                                    $('#myvideo').hide();
                                    if ($('#videolocal .no-video-container').length === 0) {
                                        $('#videolocal').append(
                                            '<div class="no-video-container"></div>'
                                        );
                                    }
                                } else {
                                    $('#videolocal .no-video-container').remove();
                                    $('#myvideo')
                                        .removeClass('hide')
                                        .show();
                                }
                            },
                            onremotestream(stream) {
                                // The publisher stream is sendonly, we don't expect anything here
                            },
                            oncleanup() {
                                Janus.log(
                                    ' ::: Got a cleanup notification: we are unpublished now :::'
                                );
                                mystream = null;
                                $('#videolocal').html(
                                    '<button id="publish" class="btn btn-primary">Publish</button>'
                                );
                                $('#publish').click(() => {
                                    publishOwnFeed(true);
                                });
                                $('#videolocal')
                                    .parent()
                                    .parent()
                                    .unblock();
                                $('#bitrate')
                                    .parent()
                                    .parent()
                                    .addClass('hide');
                                $('#bitrate a').unbind('click');
                            },
                        });
                    },
                    error(error) {
                        Janus.error(error);
                        props.actions.showHideAlertDialog(true, error, '', [
                            { text: strings.ok, onPress: () => window.location.reload() },
                        ]);
                    },
                    destroyed() {
                        window.location.reload();
                    },
                });
            },
        });
    };

    const requestLeaveRoom = (event) => {
        // if (varIsInCall) {
        if (event && varIsInCall) {
            event.preventDefault();
            event.returnValue = '';
        }

        // } else {
        //   for (var s in Janus.sessions) {
        //     if (
        //       Janus.sessions[s] !== null &&
        //       Janus.sessions[s] !== undefined &&
        //       Janus.sessions[s].destroyOnUnload
        //     ) {
        //       Janus.log('Destroying session ' + s);
        //       Janus.sessions[s].destroy({
        //         asyncRequest: false,
        //         notifyDestroyed: false,
        //       });
        //     }
        //   }
        //   if (oldOBF && typeof oldOBF == 'function') oldOBF();
        //   props.history.push();
        //   leaveRoom(roomId, uid);
        //   janus && janus.destroy();
        // }
    };

    const registerUsername = () => {
        const register = {
            request: 'join',
            room: roomId,
            ptype: 'publisher',
            display: props.username,
        };
        myusername = props.username;
        sfutest.send({ message: register });
    };

    const onSwitchTranscription = (event, checked) => {
        props.actions.toggleTranscription(roomId, checked);
        setDisableTranscriptionSwitch(true);
        setTimeout(() => {
            setDisableTranscriptionSwitch(false);
        }, 4000);
    };

    const onSwitchTranslation = (e, checked) => {
        props.actions.toggleTranslation(roomId, checked);
        setDisableTranslationSwitch(true);
        setTimeout(() => {
            setDisableTranslationSwitch(false);
        }, 4000);
    };

    const publishOwnFeed = (useAudio) => {
        // Publish our stream
        $('#publish')
            .attr('disabled', true)
            .unbind('click');
        sfutest.createOffer({
            media: {
                audioRecv: false,
                videoRecv: false,
                audioSend: useAudio,
                videoSend: true,
                data: true,
            },
            simulcast: doSimulcast,
            simulcast2: doSimulcast2,
            success(jsep) {
                Janus.debug('Got publisher SDP!');
                Janus.debug(jsep);
                const publish = { request: 'configure', audio: useAudio, video: true };
                sfutest.send({ message: publish, jsep });
            },
            error(error) {
                Janus.error('WebRTC error:', error);
                if (useAudio) {
                    publishOwnFeed(false);
                } else {
                    props.actions.showHideAlertDialog(
                        true,
                        'WebRTC error... ' + JSON.stringify(error)
                    );
                    $('#publish')
                        .removeAttr('disabled')
                        .click(() => {
                            publishOwnFeed(true);
                        });
                }
            },
        });
    };

    const newRemoteFeed = (id, display, audio, video) => {
        // A new feed has been published, create a new plugin handle and attach to it as a subscriber
        let remoteFeed = null;
        janus.attach({
            plugin: 'janus.plugin.videoroom',
            opaqueId,
            success(pluginHandle) {
                remoteFeed = pluginHandle;
                remoteFeed.simulcastStarted = false;
                Janus.log(
                    'Plugin attached! (' +
              remoteFeed.getPlugin() +
              ', id=' +
              remoteFeed.getId() +
              ')'
                );
                Janus.log('  -- This is a subscriber' + temp);

                // We wait for the plugin to send us an offer
                const subscribe = {
                    request: 'join',
                    room: roomId,
                    ptype: 'subscriber',
                    feed: id,
                    private_id: mypvtid,
                };
                if (
                    Janus.webRTCAdapter.browserDetails.browser === 'safari' &&
            (video === 'vp9' || (video === 'vp8' && !Janus.safariVp8))
                ) {
                    if (video) {
                        video = video.toUpperCase();
                    }
                    props.enqueueSnackbar(
                        'Publisher is using ' +
                video +
                ", but Safari doesn't support it: disabling video"
                    );
                    subscribe.offer_video = false;
                }
                remoteFeed.videoCodec = video;
                remoteFeed.send({ message: subscribe });
            },
            error(error) {
                Janus.error('  -- Error attaching plugin...', error);
                props.actions.showHideAlertDialog(true, 'Error attaching plugin... ' + error);
            },
            onmessage(msg, jsep) {
                Janus.debug(' ::: Got a message (subscriber) :::');
                Janus.debug(msg);
                const event = msg.videoroom;
                Janus.debug('Event: ' + event);
                if (msg.error !== undefined && msg.error !== null) {
                    props.actions.showHideAlertDialog(true, msg.error);
                } else if (event !== undefined && event !== null) {
                    //only attach user, do not attach audio listener
                    if (event === 'attached') {
                        // Subscriber created and attached
                        if (msg.display) {
                            for (let i = 1; i < 6; i++) {
                                if (feeds[i] === undefined || feeds[i] === null) {
                                    feeds[i] = remoteFeed;
                                    remoteFeed.rfindex = i;
                                    break;
                                }
                            }
                            remoteFeed.rfid = msg.id;
                            remoteFeed.rfdisplay = msg.display;
                            if (
                                remoteFeed.spinner === undefined ||
                  remoteFeed.spinner === null
                            ) {
                                const target = document.getElementById(
                                    'videoremote' + remoteFeed.rfindex
                                );
                                /* global Spinner */
                                remoteFeed.spinner = new Spinner({ top: 100 }).spin(target);
                            } else {
                                remoteFeed.spinner.spin();
                            }
                        }
                        Janus.log(
                            'Successfully attached to feed ' +
                  remoteFeed.rfid +
                  ' (' +
                  remoteFeed.rfdisplay +
                  ') in room ' +
                  msg.room
                        );
                        $('#remote' + remoteFeed.rfindex)
                            .removeClass('hide')
                            .html(remoteFeed.rfdisplay)
                            .show();
                    } else if (event === 'event') {
                        // Check if we got an event on a simulcast-related event from this publisher
                        const substream = msg.substream;
                        const temporal = msg.temporal;
                        if (
                            (substream !== null && substream !== undefined) ||
                (temporal !== null && temporal !== undefined)
                        ) {
                            if (!remoteFeed.simulcastStarted) {
                                remoteFeed.simulcastStarted = true;

                                // Add some new buttons
                                addSimulcastButtons(
                                    remoteFeed.rfindex,
                                    remoteFeed.videoCodec === 'vp8' ||
                      remoteFeed.videoCodec === 'h264'
                                );
                            }

                            // We just received notice that there's been a switch, update the buttons
                            updateSimulcastButtons(remoteFeed.rfindex, substream, temporal);
                        }
                    } else {
                        // What has just happened?
                    }
                }
                if (jsep !== undefined && jsep !== null) {
                    Janus.debug('Handling SDP as well...');
                    Janus.debug(jsep);

                    // Answer and attach
                    remoteFeed.createAnswer({
                        jsep,

                        // Add data:true here if you want to subscribe to datachannels as well
                        // (obviously only works if the publisher offered them in the first place)
                        media: { audioSend: false, videoSend: false, data: true }, // We want recvonly audio/video
                        success(jsep) {
                            Janus.debug('Got SDP!');
                            Janus.debug(jsep);
                            const body = { request: 'start', room: roomId };
                            remoteFeed.send({ message: body, jsep });
                        },
                        error(error) {
                            Janus.error('WebRTC error:', error);
                            props.actions.showHideAlertDialog(
                                true,
                                'WebRTC error... ' + JSON.stringify(error)
                            );
                        },
                    });
                }
            },
            webrtcState(on) {
                Janus.log(
                    'Janus says this WebRTC PeerConnection (feed #' +
              remoteFeed.rfindex +
              ') is ' +
              (on ? 'up' : 'down') +
              ' now'
                );
            },
            onlocalstream(stream) {
                // The subscriber stream is recvonly, we don't expect anything here
            },
            onremotestream(stream) {
                Janus.debug('Remote feed #' + remoteFeed.rfindex);
                let addButtons = false;
                if ($('#remotevideo' + remoteFeed.rfindex).length === 0) {
                    addButtons = true;

                    // No remote video yet
                    $('#videoremote' + remoteFeed.rfindex).append(
                        '<video class="rounded centered" id="waitingvideo' +
                remoteFeed.rfindex +
                '" width=320 height=240 />'
                    );
                    $('#videoremote' + remoteFeed.rfindex).append(
                        '<video class="rounded centered relative hide" id="remotevideo' +
                remoteFeed.rfindex +
                '" width="100%" height="100%" autoplay playsinline/>'
                    );
                    $('#videoremote' + remoteFeed.rfindex).append(
                        '<span class="label label-primary hide" id="curres' +
                remoteFeed.rfindex +
                '" style="position: absolute; bottom: 0px; left: 0px; margin: 15px;"></span>' +
                '<span class="label label-info hide" id="curbitrate' +
                remoteFeed.rfindex +
                '" style="position: absolute; bottom: 0px; right: 0px; margin: 15px;"></span>'
                    );

                    // Show the video, hide the spinner and show the resolution when we get a playing event
                    $('#remotevideo' + remoteFeed.rfindex).bind('playing', function() {
                        if (remoteFeed.spinner !== undefined && remoteFeed.spinner !== null) {
                            remoteFeed.spinner.stop();
                        }
                        remoteFeed.spinner = null;
                        $('#waitingvideo' + remoteFeed.rfindex).remove();
                        if (this.videoWidth) {
                            $('#remotevideo' + remoteFeed.rfindex)
                                .removeClass('hide')
                                .show();
                        }
                        const width = this.videoWidth;
                        const height = this.videoHeight;
                        $('#curres' + remoteFeed.rfindex)
                            .removeClass('hide')
                            .text(width + 'x' + height)
                            .show();
                        if (Janus.webRTCAdapter.browserDetails.browser === 'firefox') {
                            // Firefox Stable has a bug: width and height are not immediately available after a playing
                            setTimeout(() => {
                                const width = $('#remotevideo' + remoteFeed.rfindex).get(0)
                                    .videoWidth;
                                const height = $('#remotevideo' + remoteFeed.rfindex).get(0)
                                    .videoHeight;
                                $('#curres' + remoteFeed.rfindex)
                                    .removeClass('hide')
                                    .text(width + 'x' + height)
                                    .show();
                            }, 2000);
                        }
                    });
                }
                Janus.attachMediaStream(
                    $('#remotevideo' + remoteFeed.rfindex).get(0),
                    stream
                );
                const videoTracks = stream.getVideoTracks();
                if (
                    videoTracks === null ||
            videoTracks === undefined ||
            videoTracks.length === 0
                ) {
                    // No remote video
                    $('#remotevideo' + remoteFeed.rfindex).hide();
                    if (
                        $('#videoremote' + remoteFeed.rfindex + ' .no-video-container')
                            .length === 0
                    ) {
                        $('#videoremote' + remoteFeed.rfindex).append(
                            '<div class="no-video-container">' +
                  '<i class="fa fa-video-camera fa-5 no-video-icon"></i>' +
                  '<span class="no-video-text">No remote video available</span>' +
                  '</div>'
                        );
                    }
                } else {
                    $(
                        '#videoremote' + remoteFeed.rfindex + ' .no-video-container'
                    ).remove();
                    $('#remotevideo' + remoteFeed.rfindex)
                        .removeClass('hide')
                        .show();
                }
                if (!addButtons) {
                    return;
                }
                if (
                    Janus.webRTCAdapter.browserDetails.browser === 'chrome' ||
            Janus.webRTCAdapter.browserDetails.browser === 'firefox' ||
            Janus.webRTCAdapter.browserDetails.browser === 'safari'
                ) {
                    $('#curbitrate' + remoteFeed.rfindex)
                        .removeClass('hide')
                        .show();
                    bitrateTimer[remoteFeed.rfindex] = setInterval(() => {
                        // Display updated bitrate, if supported
                        const bitrate = remoteFeed.getBitrate();
                        $('#curbitrate' + remoteFeed.rfindex).text(bitrate);

                        // Check if the resolution changed too
                        const width = $('#remotevideo' + remoteFeed.rfindex).get(0) ?
                            $('#remotevideo' + remoteFeed.rfindex).get(0).videoWidth :
                            0;
                        const height = $('#remotevideo' + remoteFeed.rfindex).get(0) ?
                            $('#remotevideo' + remoteFeed.rfindex).get(0).videoHeight :
                            0;
                        if (width > 0 && height > 0) {
                            $('#curres' + remoteFeed.rfindex)
                                .removeClass('hide')
                                .text(width + 'x' + height)
                                .show();
                        }
                    }, 1000);
                }
            },
            ondataopen(data) {
                Janus.log('The DataChannel is available!');
            },
            ondata(json) {
                try {
                    const data = JSON.parse(json);
                    console.log('We got data from the DataChannel! ' + json);
                    let { src, trans } = data;
                    trans = trans ? trans.trim() : '';
                    if (messageList.length === 0) {
                        messageList.push({ ...data, trans });
                    } else {
                        //duyet tu cuoi len dau
                        let tempIndex = messageList.length - 1;
                        do {
                            if (messageList[tempIndex].src === src) {
                                if (!messageList[tempIndex].final) {
                                    messageList[tempIndex] = { ...data, trans };
                                    break;
                                } else {
                                    messageList.push({ ...data, trans });
                                    break;
                                }
                            }
                            if (tempIndex === 0 && messageList[tempIndex].src !== src) {
                                messageList.push({ ...data, trans });
                                break;
                            }
                            tempIndex--;
                        } while (tempIndex > -1);
                    }
                    setTemp([]);
                } catch (e) {
                    console.log('Something went wrong...' + e);
                }
            },
            oncleanup() {
                Janus.log(
                    ' ::: Got a cleanup notification (remote feed ' + id + ') :::'
                );
                if (remoteFeed.spinner !== undefined && remoteFeed.spinner !== null) {
                    remoteFeed.spinner.stop();
                }
                remoteFeed.spinner = null;
                $('#remotevideo' + remoteFeed.rfindex).remove();
                $('#waitingvideo' + remoteFeed.rfindex).remove();
                $('#novideo' + remoteFeed.rfindex).remove();
                $('#curbitrate' + remoteFeed.rfindex).remove();
                $('#curres' + remoteFeed.rfindex).remove();
                if (
                    bitrateTimer[remoteFeed.rfindex] !== null &&
            bitrateTimer[remoteFeed.rfindex] !== null
                ) {
                    clearInterval(bitrateTimer[remoteFeed.rfindex]);
                }
                bitrateTimer[remoteFeed.rfindex] = null;
                remoteFeed.simulcastStarted = false;
                $('#simulcast' + remoteFeed.rfindex).remove();
            },
        });
    };

    // Helpers to create Simulcast-related UI, if enabled
    const addSimulcastButtons = (feed, temporal) => {
        const index = feed;
        $('#remote' + index)
            .parent()
            .append(
                '<div id="simulcast' +
            index +
            '" class="btn-group-vertical btn-group-vertical-xs pull-right">' +
            ' <div class"row">' +
            '   <div class="btn-group btn-group-xs" style="width: 100%">' +
            '     <button id="sl' +
            index +
            '-2" type="button" class="btn btn-primary" data-toggle="tooltip" title="Switch to higher quality" style="width: 33%">SL 2</button>' +
            '     <button id="sl' +
            index +
            '-1" type="button" class="btn btn-primary" data-toggle="tooltip" title="Switch to normal quality" style="width: 33%">SL 1</button>' +
            '     <button id="sl' +
            index +
            '-0" type="button" class="btn btn-primary" data-toggle="tooltip" title="Switch to lower quality" style="width: 34%">SL 0</button>' +
            '   </div>' +
            ' </div>' +
            ' <div class"row">' +
            '   <div class="btn-group btn-group-xs hide" style="width: 100%">' +
            '     <button id="tl' +
            index +
            '-2" type="button" class="btn btn-primary" data-toggle="tooltip" title="Cap to temporal layer 2" style="width: 34%">TL 2</button>' +
            '     <button id="tl' +
            index +
            '-1" type="button" class="btn btn-primary" data-toggle="tooltip" title="Cap to temporal layer 1" style="width: 33%">TL 1</button>' +
            '     <button id="tl' +
            index +
            '-0" type="button" class="btn btn-primary" data-toggle="tooltip" title="Cap to temporal layer 0" style="width: 33%">TL 0</button>' +
            '   </div>' +
            ' </div>' +
            '</div>'
            );

        // Enable the simulcast selection buttons
        $('#sl' + index + '-0')
            .removeClass('btn-primary btn-success')
            .addClass('btn-primary')
            .unbind('click')
            .click(() => {
                props.enqueueSnackbar(
                    'Switching simulcast substream, wait for it... (lower quality)',
                    null,
                    { timeOut: 2000 }
                );
                if (!$('#sl' + index + '-2').hasClass('btn-success')) {
                    $('#sl' + index + '-2')
                        .removeClass('btn-primary btn-info')
                        .addClass('btn-primary');
                }
                if (!$('#sl' + index + '-1').hasClass('btn-success')) {
                    $('#sl' + index + '-1')
                        .removeClass('btn-primary btn-info')
                        .addClass('btn-primary');
                }
                $('#sl' + index + '-0')
                    .removeClass('btn-primary btn-info btn-success')
                    .addClass('btn-info');
                feeds[index].send({ message: { request: 'configure', substream: 0 } });
            });
        $('#sl' + index + '-1')
            .removeClass('btn-primary btn-success')
            .addClass('btn-primary')
            .unbind('click')
            .click(() => {
                props.enqueueSnackbar(
                    'Switching simulcast substream, wait for it... (normal quality)',
                    null,
                    { timeOut: 2000 }
                );
                if (!$('#sl' + index + '-2').hasClass('btn-success')) {
                    $('#sl' + index + '-2')
                        .removeClass('btn-primary btn-info')
                        .addClass('btn-primary');
                }
                $('#sl' + index + '-1')
                    .removeClass('btn-primary btn-info btn-success')
                    .addClass('btn-info');
                if (!$('#sl' + index + '-0').hasClass('btn-success')) {
                    $('#sl' + index + '-0')
                        .removeClass('btn-primary btn-info')
                        .addClass('btn-primary');
                }
                feeds[index].send({ message: { request: 'configure', substream: 1 } });
            });
        $('#sl' + index + '-2')
            .removeClass('btn-primary btn-success')
            .addClass('btn-primary')
            .unbind('click')
            .click(() => {
                props.enqueueSnackbar(
                    'Switching simulcast substream, wait for it... (higher quality)',
                    null,
                    { timeOut: 2000 }
                );
                $('#sl' + index + '-2')
                    .removeClass('btn-primary btn-info btn-success')
                    .addClass('btn-info');
                if (!$('#sl' + index + '-1').hasClass('btn-success')) {
                    $('#sl' + index + '-1')
                        .removeClass('btn-primary btn-info')
                        .addClass('btn-primary');
                }
                if (!$('#sl' + index + '-0').hasClass('btn-success')) {
                    $('#sl' + index + '-0')
                        .removeClass('btn-primary btn-info')
                        .addClass('btn-primary');
                }
                feeds[index].send({ message: { request: 'configure', substream: 2 } });
            });
        if (!temporal)
        // No temporal layer support
        {
            return;
        }
        $('#tl' + index + '-0')
            .parent()
            .removeClass('hide');
        $('#tl' + index + '-0')
            .removeClass('btn-primary btn-success')
            .addClass('btn-primary')
            .unbind('click')
            .click(() => {
                props.enqueueSnackbar(
                    'Capping simulcast temporal layer, wait for it... (lowest FPS)',
                    null,
                    { timeOut: 2000 }
                );
                if (!$('#tl' + index + '-2').hasClass('btn-success')) {
                    $('#tl' + index + '-2')
                        .removeClass('btn-primary btn-info')
                        .addClass('btn-primary');
                }
                if (!$('#tl' + index + '-1').hasClass('btn-success')) {
                    $('#tl' + index + '-1')
                        .removeClass('btn-primary btn-info')
                        .addClass('btn-primary');
                }
                $('#tl' + index + '-0')
                    .removeClass('btn-primary btn-info btn-success')
                    .addClass('btn-info');
                feeds[index].send({ message: { request: 'configure', temporal: 0 } });
            });
        $('#tl' + index + '-1')
            .removeClass('btn-primary btn-success')
            .addClass('btn-primary')
            .unbind('click')
            .click(() => {
                props.enqueueSnackbar(
                    'Capping simulcast temporal layer, wait for it... (medium FPS)',
                    null,
                    { timeOut: 2000 }
                );
                if (!$('#tl' + index + '-2').hasClass('btn-success')) {
                    $('#tl' + index + '-2')
                        .removeClass('btn-primary btn-info')
                        .addClass('btn-primary');
                }
                $('#tl' + index + '-1')
                    .removeClass('btn-primary btn-info')
                    .addClass('btn-info');
                if (!$('#tl' + index + '-0').hasClass('btn-success')) {
                    $('#tl' + index + '-0')
                        .removeClass('btn-primary btn-info')
                        .addClass('btn-primary');
                }
                feeds[index].send({ message: { request: 'configure', temporal: 1 } });
            });
        $('#tl' + index + '-2')
            .removeClass('btn-primary btn-success')
            .addClass('btn-primary')
            .unbind('click')
            .click(() => {
                props.enqueueSnackbar(
                    'Capping simulcast temporal layer, wait for it... (highest FPS)',
                    null,
                    { timeOut: 2000 }
                );
                $('#tl' + index + '-2')
                    .removeClass('btn-primary btn-info btn-success')
                    .addClass('btn-info');
                if (!$('#tl' + index + '-1').hasClass('btn-success')) {
                    $('#tl' + index + '-1')
                        .removeClass('btn-primary btn-info')
                        .addClass('btn-primary');
                }
                if (!$('#tl' + index + '-0').hasClass('btn-success')) {
                    $('#tl' + index + '-0')
                        .removeClass('btn-primary btn-info')
                        .addClass('btn-primary');
                }
                feeds[index].send({ message: { request: 'configure', temporal: 2 } });
            });
    };

    const updateSimulcastButtons = (feed, substream, temporal) => {
        // Check the substream
        const index = feed;
        if (substream === 0) {
            props.enqueueSnackbar(
                'Switched simulcast substream! (lower quality)',
                null,
                {
                    timeOut: 2000,
                }
            );
            $('#sl' + index + '-2')
                .removeClass('btn-primary btn-success')
                .addClass('btn-primary');
            $('#sl' + index + '-1')
                .removeClass('btn-primary btn-success')
                .addClass('btn-primary');
            $('#sl' + index + '-0')
                .removeClass('btn-primary btn-info btn-success')
                .addClass('btn-success');
        } else if (substream === 1) {
            props.enqueueSnackbar(
                'Switched simulcast substream! (normal quality)',
                null,
                {
                    timeOut: 2000,
                }
            );
            $('#sl' + index + '-2')
                .removeClass('btn-primary btn-success')
                .addClass('btn-primary');
            $('#sl' + index + '-1')
                .removeClass('btn-primary btn-info btn-success')
                .addClass('btn-success');
            $('#sl' + index + '-0')
                .removeClass('btn-primary btn-success')
                .addClass('btn-primary');
        } else if (substream === 2) {
            props.enqueueSnackbar(
                'Switched simulcast substream! (higher quality)',
                null,
                {
                    timeOut: 2000,
                }
            );
            $('#sl' + index + '-2')
                .removeClass('btn-primary btn-info btn-success')
                .addClass('btn-success');
            $('#sl' + index + '-1')
                .removeClass('btn-primary btn-success')
                .addClass('btn-primary');
            $('#sl' + index + '-0')
                .removeClass('btn-primary btn-success')
                .addClass('btn-primary');
        }

        // Check the temporal layer
        if (temporal === 0) {
            props.enqueueSnackbar(
                'Capped simulcast temporal layer! (lowest FPS)',
                null,
                {
                    timeOut: 2000,
                }
            );
            $('#tl' + index + '-2')
                .removeClass('btn-primary btn-success')
                .addClass('btn-primary');
            $('#tl' + index + '-1')
                .removeClass('btn-primary btn-success')
                .addClass('btn-primary');
            $('#tl' + index + '-0')
                .removeClass('btn-primary btn-info btn-success')
                .addClass('btn-success');
        } else if (temporal === 1) {
            props.enqueueSnackbar(
                'Capped simulcast temporal layer! (medium FPS)',
                null,
                {
                    timeOut: 2000,
                }
            );
            $('#tl' + index + '-2')
                .removeClass('btn-primary btn-success')
                .addClass('btn-primary');
            $('#tl' + index + '-1')
                .removeClass('btn-primary btn-info btn-success')
                .addClass('btn-success');
            $('#tl' + index + '-0')
                .removeClass('btn-primary btn-success')
                .addClass('btn-primary');
        } else if (temporal === 2) {
            props.enqueueSnackbar(
                'Capped simulcast temporal layer! (highest FPS)',
                null,
                {
                    timeOut: 2000,
                }
            );
            $('#tl' + index + '-2')
                .removeClass('btn-primary btn-info btn-success')
                .addClass('btn-success');
            $('#tl' + index + '-1')
                .removeClass('btn-primary btn-success')
                .addClass('btn-primary');
            $('#tl' + index + '-0')
                .removeClass('btn-primary btn-success')
                .addClass('btn-primary');
        }
    };

    const toggleMute = () => {
        let muted = sfutest.isAudioMuted();
        Janus.log((muted ? 'Unmuting' : 'Muting') + ' local stream...');
        if (muted) {
            sfutest.unmuteAudio();
        } else {
            sfutest.muteAudio();
        }
        muted = sfutest.isAudioMuted();
        $('#mute').html(muted ? 'Unmute' : 'Mute');
    };

    const unpublishOwnFeed = () => {
        if (publish) {
            $('#unpublish').removeClass('fa-video');
            $('#unpublish').addClass('fa-video-slash');
            sfutest.createOffer({
                media: { removeVideo: true },
                success(jsep) {
                    Janus.debug(jsep);
                    sfutest.send({ message: { audio: true, video: true }, jsep });
                },
                error(error) {
                    props.actions.showHideAlertDialog(
                        true,
                        'WebRTC error... ' + JSON.stringify(error)
                    );
                },
            });
            publish = false;
        } else {
            $('#unpublish').removeClass('fa-video-slash');
            $('#unpublish').addClass('fa-video');
            sfutest.createOffer({
                media: { addVideo: true },
                success(jsep) {
                    Janus.debug(jsep);
                    sfutest.send({ message: { audio: true, video: true }, jsep });
                },
                error(error) {
                    props.actions.showHideAlertDialog(
                        true,
                        'WebRTC error... ' + JSON.stringify(error)
                    );
                },
            });
            publish = true;
        }
    };

    const onStartVideoCall = async () => {
        props.actions.showHideLoadingDialog(
            true,
            'It may takes about 40 seconds for the first time!',
            'Initializing'
        );

        // Initialize the library (all console debuggers enabled)
        props.actions.joinRoom(joinRoomSuccessWithRoomId);
    };

    const onClickTest = (e) => {
        props.actions.props.actions.showHideLoadingDialog(true,'messsagee')
    }

    const classes = useStyles();
    const { currentUserId, role, rooms } = props;
    const transcriptionEnabled = _.get(rooms, roomId + '.users.' + currentUserId + '.transcription') || false
    const translationEnabled = _.get(rooms, roomId + '.users.' + currentUserId + '.translation') || false
    const usersInRoom = _.get(rooms, roomId + '.users') || [];

    return (
        <Grid container={true} className={classes.root}>
            <InviteDialog
                visible={inviteDialogVisible}
                onClose={() => setInviteDialogVisible(false)}
            />
            <Grid container={true} alignItems="center">
                <Grid container={true} alignItems="center" style={{ flex: 1 }}>
                    <Button
                        color="primary"
                        variant="contained"
                        className={classes.button}
                        id="start"
                        onClick={onStartVideoCall}
                    >
                        {isInCall ? 'Stop' : 'Start video call'}
                    </Button>
                    {isInCall ? (
                        <Button
                            color="primary"
                            variant="contained"
                            className={classes.button}
                            onClick={() => setInviteDialogVisible(true)}
                        >
                        Invite
                        </Button>
                    ) : null}
                    {/*<Button
                        color="primary"
                        className={classes.button}
                        onClick={onClickTest}
                    >
                        Test button
                    </Button>*/}
                    {isInCall ? (
                        <FormControlLabel
                            control={
                                <Switch
                                    color="primary"
                                    onChange={onSwitchTranscription}
                                    checked={transcriptionEnabled}
                                    disabled={disableTranscriptionSwitch}
                                />
                            }
                            label="Transcription"
                            labelPlacement="start"
                        />
                    ) : null}
                    {isInCall ? (
                        <FormControlLabel
                            control={
                                <Switch
                                    color="primary"
                                    onChange={onSwitchTranslation}
                                    checked={translationEnabled}
                                    disabled={disableTranslationSwitch}
                                />
                            }
                            label="Vietnamese translation"
                            labelPlacement="start"
                        />
                    ) : null}
                </Grid>
                {/* {isInCall ? (
              <Timer ref={timerRef} initialTime={0} startImmediately={false}>
                {({ start }) => (
                  <React.Fragment>
                    <Card style={{ paddingLeft: 20, paddingRight: 20 }}>
                      <Timer.Hours />:<Timer.Minutes />:<Timer.Seconds />
                    </Card>
                    <Button
                      color="primary"
                      variant="contained"
                      className={classes.timerButton}
                      disabled={timerRunning || role !== Constants.USER_ROLE.TEACHER}
                      onClick={() => {
                        start();
                        onStartTimer();
                      }}
                    >
                      Start timer
                    </Button>
                  </React.Fragment>
                )}
              </Timer>
            ) : null} */}
            </Grid>
            <Grid
                container={true}
                spacing={3}
                id="videos"
                className={classes.videoContainer}
            >
                <Grid item={true} xs={7}>
                    <Card className={classes.windowStyle}>
                        <ScrollToBottom className={classes.listSubtitle}>
                            <List>
                                {messageList.map((m, i) => (
                                    <Message
                                        key={i}
                                        message={m.trans}
                                        vi={m.vi}
                                        en={m.en}
                                        mine={m.src === uid}
                                        last={messageList[i - 1]}
                                        next={messageList[i + 1]}
                                        final={m.final}
                                        src={m.src}
                                        viTranslation={translationEnabled}
                                        photoURL={
                                            usersInRoom &&
                          usersInRoom[m.src] &&
                          usersInRoom[m.src].photoURL
                                        }
                                    />
                                ))}
                            </List>
                        </ScrollToBottom>
                        <div className={classes.textInputContainer}>
                            <TextField
                                id="standard-textarea"
                                label="Chat"
                                placeholder="Type something..."
                                multiline={true}
                                className={classes.textInput}
                                rowsMax={2}
                                rows={2}
                                variant="outlined"

                                // onChange={onChangeText}
                                value={message}

                                // onKeyDown={onKeyDown}
                                disabled={!isInCall}
                            />
                            <IconButton
                                className={classes.sendIcon}

                                // onClick={onSendMessage}
                                disabled={!isInCall}
                            >
                                <Send />
                            </IconButton>
                        </div>
                    </Card>
                </Grid>
                <Grid item={true} xs={5}>
                    <Card className={classes.windowStyle}>
                        <GridList className={classes.gridList}>
                            <GridListTile key={1} className={classes.videoWindowStyle}>
                                <div className="panel-body" id="videolocal" />
                                <GridListTileBar
                                    titlePosition="top"
                                    title={
                                        <Typography variant="body1" id="publisher">
                          Local video
                                        </Typography>
                                    }
                                />
                            </GridListTile>
                            {remoteList.map((tile, index) => (
                                <GridListTile key={index} className={classes.videoWindowStyle}>
                                    <div
                                        className="panel-body relative"
                                        id={'videoremote' + (tile + 1)}
                                    />
                                    <GridListTileBar
                                        titlePosition="top"
                                        title={
                                            <Typography variant="body1" id={'remote' + (tile + 1)}>
                            Remote Video #{tile + 1}
                                            </Typography>
                                        }
                                    />
                                </GridListTile>
                            ))}
                        </GridList>
                    </Card>
                </Grid>
            </Grid>
        </Grid>
    );
}

export default CallScreen;

const useStyles = makeStyles((theme) => ({
    root: {
        backgroundColor: '#eee',
        height: 'calc(100vh - 64px)',
    },
    videoContainer: {
        marginTop: 0,
        margin: theme.spacing(2),
    },
    paper: {
        padding: theme.spacing(3),
        textAlign: 'center',
        color: theme.palette.text.secondary,
    },
    button: {
        marginLeft: theme.spacing(3),
        marginTop: 0,
        marginBottom: 0,
    },
    timerButton: {
        margin: theme.spacing(3),
        marginTop: 0,
        marginBottom: 0,
    },
    windowTitle: {},
    windowStyle: {
        height: '77vh',
        padding: theme.spacing(2),
    },
    videoWindowStyle: {
        minHeight: theme.spacing(30),
        border: 'solid 1px #000',
        maxHeight: theme.spacing(60),
    },
    subtitleBox: {
        borderRadius: theme.spacing(8),
        border: 'solid 1px #000',
        paddingLeft: theme.spacing(1),
        margin: theme.spacing(3),
    },
    listSubtitle: {
        overflow: 'auto',
        backgroundColor: '#fff',
        height: '69vh',
    },
    gridList: {
        overflow: 'scroll',
        height: '77vh',
        '&::-webkit-scrollbar': {
            display: 'block',
        },
    },
    textInputContainer: {
        width: '100%',
        justifyContent: 'center',
    },
    textInput: {
        width: '92%',
        fontWeight: 'normal',
    },
}));
