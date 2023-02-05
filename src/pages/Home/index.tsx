import React, { useEffect, useLayoutEffect, useState } from 'react';
import { Store } from 'react-notifications-component';

import { IPc, ISetting, IToggle } from '../../type/index.js';

import h from '../../lib/helpers.js';

import Video from '../../components/Video';
import Navbar from '../../components/Navbar';

import './index.scss';

const socketIOClient = require('socket.io-client');
const ENDPOINT = 'https://record.kunnec.com/stream';
// const ENDPOINT = "http://localhost:3001/stream";

const socket = socketIOClient(ENDPOINT);

window.socketPc = {};

const useWindowSize = () => {
    const [size, setSize] = useState([0, 0]);
    useLayoutEffect(() => {
        function updateSize() {
            setSize([window.innerWidth, window.innerHeight]);
        }
        window.addEventListener('resize', updateSize);
        updateSize();
        return () => window.removeEventListener('resize', updateSize);
    }, []);
    return size;
}

let guestUsers = [] as IPc[];

const Home = () => {
    const [sId, setSId] = useState('');
    const [panel, setPanel] = useState(false);
    const [shared, setShared] = useState(0);

    const [myPc, setMyPc] = useState<IPc | null>(null);
    const [guestPC, setGuestPC] = useState<IPc[]>([]);

    const [myStream, setMyStream] = useState<any>();
    const [screenStream, setScreenStream] = useState<MediaStream | null>(null);
    const [audioOutput, setAudioOutput] = useState<string>('');
    const [setting, setSetting] = useState<ISetting>({
        video: '',
        audioInput: ''
    });
    const [toggle, setToggle] = useState<IToggle>({
        audio: true,
        video: true
    });

    const room = window.location.hash.split('#')[1];
    const [width, height] = useWindowSize();

    const setMedia = async () => {
        const stream = await h.getUserFullMedia(setting);
        h.setLocalStream(stream);
        setMyStream(stream);
        return stream;
    }

    const broadcastNewTracks = (stream: any, type: string) => {
        let track: any;

        if (guestPC.length > 0) {
            if (type === 'audio') {
                track = stream.getAudioTracks()[0];
            } else {
                track = stream.getVideoTracks()[0];
            }

            for (let p in window.socketPc) {
                let pName = window.socketPc[p];

                if (p.indexOf('screenShare') === -1 && typeof pName === 'object') {
                    h.replaceTrack(track, pName);
                }
            }
        }
    }

    const toggleAction = (type: string) => {
        let _toggle = { ...toggle };
        _toggle[type] = !_toggle[type];
        setToggle(_toggle);

        if (myStream) {
            if (type === 'audio') {
                myStream.getAudioTracks()[0].enabled = _toggle.audio;
                broadcastNewTracks(myStream, 'audio');
            }
            else if (type === 'video') {
                myStream.getVideoTracks()[0].enabled = _toggle.video;
                broadcastNewTracks(myStream, 'video');
            }
        }
    }

    const changeSetting = async (value: string, type: string) => {
        if (type === 'audioOutput') {
            setAudioOutput(value);
            return;
        }
        let _setting = { ...setting };
        _setting[type] = value;

        const stream = await h.getUserFullMedia(_setting);
        if (stream) {
            stream.getAudioTracks()[0].enabled = toggle.audio;
            stream.getVideoTracks()[0].enabled = toggle.video;
        }

        h.setLocalStream(stream);

        broadcastNewTracks(stream, 'audio');
        broadcastNewTracks(stream, 'video');

        setSetting(_setting);
    }

    const getUserAuth = async () => {
        const res = await fetch('https://kunnec.com/api/get-info');
        const json = await res.json();
        const auth = json.authorization;

        if (auth === 'fail') {
            window.location.href = '/public/login';
        }

        const u = {
            clientId: sId,
            id: auth['id'],
            first_name: auth['first_name'],
            last_name: auth['last_name'],
            username: auth['username'],
            gender: auth['gender'],
            image: auth['image'],
        }

        // const u = {
        //     clientId: 'clientId',
        //     id: 0,
        //     first_name: 'Calor',
        //     last_name: 'Brown',
        //     username: 'Calor',
        //     gender: 0,
        //     image: 'https://kunnec.com/user-dash/images/users/profiles/1671974293_image.jpeg',
        // }

        return u;
    }

    const switchToggle = (index: boolean) => {
        setPanel(index);
    }

    const screenSharingStart = async () => {
        if (shared) {
            Store.addNotification({
                message: 'Already shared a screen.',
                type: 'danger',
                insert: 'top',
                container: 'top-right',
                animationIn: ['animate__animated', 'animate__fadeIn'],
                animationOut: ['animate__animated', 'animate__fadeOut'],
                dismiss: {
                    duration: 2000,
                    onScreen: true
                }
            });
            return;
        }

        const screen = await h.screenSharing();

        if (screen) {
            setShared(1);
            setScreenStream(screen);
            h.setScreenStream(screen);

            if (guestPC.length > 0)
                socket.emit('screenShareStart', {
                    room: room,
                    sender: sId
                });

            screen.getVideoTracks()[0].addEventListener('ended', () => {
                stopSharing();
            });
        }
    }

    const stopSharing = () => {
        if (window.socketPc['screenShare']) {
            window.socketPc['screenShare'] = null;
            delete window.socketPc['screenShare'];
        }

        setShared(0);

        if (guestPC.length > 0) {
            socket.emit('screenShareStop', {
                room: room,
                sender: sId
            })
        }
    }

    const initNewUser = async (createOffer: boolean, isScreen: boolean, stream: MediaStream | null, id: string, partnerName: string, cb: Function) => {
        try {
            let con = new RTCPeerConnection(h.getIceServer());
            cb(con);

            //send ice candidate to partnerNames
            con.onicecandidate = ({ candidate }) => {
                socket.emit('ice candidates', {
                    candidate: candidate,
                    to: partnerName,
                    sender: id,
                    isScreen: isScreen
                });
            };

            if (!isScreen) {
                con.ontrack = (e) => {
                    const elem = document.getElementById(partnerName) as HTMLVideoElement;
                    if (e.streams && e.streams[0]) {
                        elem.srcObject = e.streams[0];
                    }
                };
            }
            else if (!createOffer) {
                con.ontrack = (e) => {
                    const elem = document.getElementById('screen') as HTMLVideoElement;
                    if (e.streams && e.streams[0]) {
                        elem.srcObject = e.streams[0];
                    }
                };
            }

            con.onconnectionstatechange = (d) => {
                switch (con.iceConnectionState) {
                    case 'disconnected':
                    case 'failed':
                    case 'closed':
                        break;
                }
            };

            con.onsignalingstatechange = (d) => {
                switch (con.signalingState) {
                    case 'closed':
                        alert('Signalling state is "closed"');
                        break;
                }
            };

            if (stream) {
                stream.getTracks().forEach((track) => {
                    con.addTrack(track, stream); //should trigger negotiationneeded event
                });

                if (!isScreen) {
                    h.setLocalStream(stream);
                    setMyStream(stream);
                }
            }

            //create offer
            if (createOffer) {
                con.onnegotiationneeded = async () => {
                    let offer = await con.createOffer({ offerToReceiveAudio: true, offerToReceiveVideo: true });

                    await con.setLocalDescription(offer);
                    socket.emit('sdp', {
                        description: con.localDescription,
                        to: partnerName,
                        sender: id,
                        isScreen: isScreen
                    });
                };
            }
        } catch (error) {
            console.error('initNewUser', error);
        }
        return null;
    }

    useEffect(() => {
        setMedia();
    }, [])

    useEffect(() => {
        if (audioOutput !== '')
            h.switchSpeaker(audioOutput);
    }, [audioOutput, guestPC.length])

    useEffect(() => {
        const navHeight = document.getElementsByTagName('nav')[0].offsetHeight;
        const mainHeight = height - navHeight;
        h.adjustVideoSize(width, mainHeight, panel, shared);

    }, [width, height, guestPC.length, panel, shared]);

    useEffect(() => {
        try {
            const myId = socket.io.engine.id;

            socket.on('connect', async () => {
                const myId = socket.io.engine.id;
                console.log('socket Id = ', myId);

                const _myPc = await getUserAuth();

                setSId(myId);
                setMyPc({ ..._myPc, clientId: myId });

                socket.emit('subscribe', {
                    room: room,
                    socketId: myId,
                    userData: { ..._myPc, clientId: myId },
                });
            });

            socket.on('room', async (data: any) => {
                const stream = await setMedia() as MediaStream;

                guestUsers.push(data.user);
                setGuestPC(guestUsers);

                await initNewUser(false, false, stream, myId, data.socketId, (con) => window.socketPc[data.socketId] = con);

                socket.emit('newUserStart', {
                    to: data.socketId,
                    sender: myId,
                    user: { ...myPc, clientId: myId },
                });

                Store.addNotification({
                    message: `${data.user.first_name} ${data.user.last_name} joined the Room`,
                    type: 'info',
                    insert: 'top',
                    container: 'top-right',
                    animationIn: ['animate__animated', 'animate__fadeIn'],
                    animationOut: ['animate__animated', 'animate__fadeOut'],
                    dismiss: {
                        duration: 2000,
                        onScreen: true
                    }
                });
            });

            socket.on('newUserStart', async (data: any) => {
                const stream = await setMedia() as MediaStream;

                guestUsers.push(data.user);

                setGuestPC(guestUsers);

                await initNewUser(true, false, stream, myId, data.sender, (con) => window.socketPc[data.sender] = con);
            });

            socket.on('screenShareStart', async (data: any) => {
                await initNewUser(false, true, null, myId, data.sender, (con) => window.socketPc[`screenShare-${data.sender}`] = con);

                socket.emit('screenShareReady', {
                    to: data.sender,
                    sender: myId
                });
                setShared(2);
            });

            socket.on('screenShareReady', (data: any) => {
                initNewUser(true, true, screenStream, myId, data.sender, (con) => window.socketPc[`screenShare-${data.sender}`] = con);
            });

            socket.on('screenShareStop', (data) => {
                if (window.socketPc[`screenShare-${data.sender}`]) {
                    window.socketPc[`screenShare-${data.sender}`] = null;
                    delete window.socketPc[`screenShare-${data.sender}`];
                }
                setShared(0);
            })

            socket.on('ice candidates', async (data: any) => {
                if (data.candidate) {
                    let key = '';

                    if (data.isScreen) key = 'screenShare-' + data.sender;
                    else key = data.sender;

                    if (window.socketPc[key]) {
                        await window.socketPc[key].addIceCandidate(new RTCIceCandidate(data.candidate));
                    }
                }
            });

            socket.on('sdp', async (data: any) => {
                let key = '';

                if (data.isScreen) key = 'screenShare-' + data.sender;
                else key = data.sender;

                if (window.socketPc[key]) {
                    if (data.description.type === 'offer') {
                        await window.socketPc[key].setRemoteDescription(new RTCSessionDescription(data.description));

                        if (window.socketPc[key]) {
                            const answer = await window.socketPc[key].createAnswer();

                            await window.socketPc[key].setLocalDescription(answer);

                            socket.emit('sdp', {
                                description: window.socketPc[key].localDescription,
                                to: data.sender,
                                sender: myId,
                                isScreen: data.isScreen,
                            });
                        } else {
                            console.error(`${key} socket is null`);
                        }
                    } else if (data.description.type === 'answer') {
                        await window.socketPc[key].setRemoteDescription(new RTCSessionDescription(data.description));
                    }
                }
            });

            socket.on('disconnect room', (data: any) => {
                const _data = guestUsers.filter((ele: any) => ele.clientId !== data.clientId);
                const deleted_user = guestUsers.filter((ele: IPc) => ele.clientId === data.clientId);

                delete window.socketPc[data.clientId];

                if (shared === 2) {
                    if (window.socketPc[`screenShare-${data.clientId}`]) {
                        window.socketPc[`screenShare-${data.clientId}`].close();
                        delete window.socketPc[`screenShare-${data.clientId}`];
                        setShared(0);
                    }
                }

                if (deleted_user[0]) {
                    Store.addNotification({
                        message: `${deleted_user[0]?.first_name} ${deleted_user[0]?.last_name} left the Room`,
                        type: 'danger',
                        insert: 'top',
                        container: 'top-right',
                        animationIn: ['animate__animated', 'animate__fadeIn'],
                        animationOut: ['animate__animated', 'animate__fadeOut'],
                        dismiss: {
                            duration: 2000,
                            onScreen: true
                        }
                    });
                }

                guestUsers = _data;
                setGuestPC(guestUsers);
            });
        } catch (error) {
            console.error('Socket connect error = ', error);
        }

        return () => {
            socket.off('connect');
            socket.off('disconnect');
            socket.off('sdp');
            socket.off('ice candidates');
            socket.off('screenShareStart');
            socket.off('screenShareReady');
            socket.off('newUserStart');
            socket.off('room');
            socket.off('disconnect room');
        };
    }, [myPc, guestPC.length, screenStream, shared]);

    return (
        <>
            <Navbar  {...{ host: myPc, partner: guestPC, socket: socket }} onToggle={(key: string) => toggleAction(key)} screenSharing={() => screenSharingStart()} onSetting={(index: string, type: string) => changeSetting(index, type)} />
            <main className="home">
                <div className="main">
                    <div className="main-board">
                        <Video {...{ name: '', type: 'screen', id: 'screenShare' }} />
                        {
                            guestPC.map((ele => (
                                <Video key={ele.clientId} {...{ name: ele.first_name, type: 'guest', id: ele.clientId }} />
                            )))
                        }
                        <Video {...{ name: 'You', type: 'host', id: myPc?.clientId }} onSwitchToggle={(index: boolean) => switchToggle(index)} />
                    </div>
                </div>
            </main>
        </>
    )
}

export default Home;