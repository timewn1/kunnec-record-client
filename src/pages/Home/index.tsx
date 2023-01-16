import React, { useEffect, useLayoutEffect, useState } from 'react';
import { Store } from 'react-notifications-component';

import { IPc, ISetting, IToggle } from '../../type/index.js';

import h from '../../lib/helpers.js';

import Video from '../../components/Video';
import Navbar from '../../components/Navbar';

import './index.scss';

const socketIOClient = require('socket.io-client');
// const ENDPOINT = "https://record.kunnec.com/stream";
const ENDPOINT = "http://localhost:3001/stream";

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

const Home = () => {
    const [sId, setSId] = useState('');
    const [myStream, setMyStream] = useState<any>();
    const [myPc, setMyPc] = useState<IPc>(
        {
            clientId: '',
            id: new Date().valueOf(),
            first_name: "",
            last_name: "",
            username: "",
            gender: -1,
            image: "",
        }
    );
    const [guestPC, setGuestPC] = useState<IPc[]>([]);
    const [setting, setSetting] = useState<ISetting>({
        video: '',
        audioInput: ''
    });
    const [toggle, setToggle] = useState<IToggle>({
        audio: true,
        video: true
    });
    const [panel, setPanel] = useState(0);

    const room = window.location.hash.split('#')[1];
    const [width, height] = useWindowSize();

    const setMedia = async (id: string) => {
        const _myStream = await h.getUserFullMedia(setting);
        h.setLocalStream(_myStream);
        setMyStream(_myStream);
        return _myStream;
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
                if (typeof pName === 'object') {
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

    const changeSetting = async (index: number, type: string) => {
        let _setting = { ...setting };
        _setting[type] = index;

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

    const disConnect = (partnerId: string) => {
        socket.emit('disconnect user', {
            partnerId: partnerId,
        });
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

    useEffect(() => {
        const navHeight = document.getElementsByTagName('nav')[0].offsetHeight;
        const mainHeight = height - navHeight;

        h.adjustVideoSize('video-ele', width, mainHeight, guestPC.length + 1, panel);

    }, [width, height, guestPC, panel]);

    useEffect(() => {
        try {
            const myId = socket.io.engine.id;

            socket.on('connect', async () => {
                const myId = socket.io.engine.id;
                console.log('socket Id = ', myId);

                const _myPc = await getUserAuth();

                setMedia(myId);
                setSId(myId);
                setMyPc({ ..._myPc, clientId: myId });

                socket.emit('subscribe', {
                    room: room,
                    socketId: myId,
                    userData: { ..._myPc, clientId: myId },
                });
            });

            socket.on('room', async (data: any) => {
                setGuestPC([data.user]);
                setPanel(1);

                await initNewUser(false, myId, data.socketId, (con) => window.socketPc[data.socketId] = con);

                socket.emit('newUserStart', {
                    to: data.socketId,
                    sender: myId,
                    user: { ...myPc, clientId: myId },
                });

                Store.addNotification({
                    title: "Info!",
                    message: `${data.user.first_name} ${data.user.last_name} joined the Room`,
                    type: "info",
                    insert: "top",
                    container: "top-right",
                    animationIn: ["animate__animated", "animate__fadeIn"],
                    animationOut: ["animate__animated", "animate__fadeOut"],
                    dismiss: {
                        duration: 2000,
                        onScreen: true
                    }
                });
            });

            socket.on('newUserStart', async (data: any) => {
                setGuestPC([data.user]);
                setPanel(1);
                initNewUser(true, myId, data.sender, (con) => window.socketPc[data.sender] = con);
            });

            socket.on('ice candidates', async (data: any) => {
                if (data.candidate) {
                    if (window.socketPc[data.sender]) {
                        await window.socketPc[data.sender].addIceCandidate(new RTCIceCandidate(data.candidate));
                    }
                }
            });

            socket.on('sdp', async (data: any) => {
                if (window.socketPc[data.sender]) {
                    if (data.description.type === 'offer') {
                        await window.socketPc[data.sender].setRemoteDescription(new RTCSessionDescription(data.description));

                        if (window.socketPc[data.sender]) {
                            const answer = await window.socketPc[data.sender].createAnswer();

                            await window.socketPc[data.sender].setLocalDescription(answer);

                            socket.emit('sdp', {
                                description: window.socketPc[data.sender].localDescription,
                                to: data.sender,
                                sender: myId,
                            });
                        } else {
                            console.error("data.sender socket is null");
                        }
                    } else if (data.description.type === 'answer') {
                        await window.socketPc[data.sender].setRemoteDescription(new RTCSessionDescription(data.description));
                    }
                }
            });

            socket.on('disconnected room', () => {
                window.setTimeout(() => {
                    window.location.href = '/public/k_spot/k_spot';
                }, 1000);
            })

            socket.on('disconnect room', (data: any) => {
                delete window.socketPc[data.clientId];
                setGuestPC([]);

                Store.addNotification({
                    message: `${guestPC[0]?.first_name} ${guestPC[0]?.last_name} left the Room`,
                    type: "danger",
                    insert: "top",
                    container: "top-right",
                    animationIn: ["animate__animated", "animate__fadeIn"],
                    animationOut: ["animate__animated", "animate__fadeOut"],
                    dismiss: {
                        duration: 2000,
                        onScreen: true
                    }
                });
            });

            const initNewUser = async (createOffer: boolean, id: string, partnerName: string, cb: Function) => {
                try {
                    let con = new RTCPeerConnection(h.getIceServer());
                    cb(con);

                    const stream = await h.getUserFullMedia(setting);

                    //send ice candidate to partnerNames
                    con.onicecandidate = ({ candidate }) => {
                        socket.emit('ice candidates', {
                            candidate: candidate,
                            to: partnerName,
                            sender: id,
                        });
                    };

                    //add track
                    con.ontrack = (e) => {
                        const elem = document.getElementById('guest') as any;
                        if (e.streams && e.streams[0]) {
                            elem.srcObject = e.streams[0];
                        }
                    };

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
                                alert("Signalling state is 'closed'");
                                break;
                        }
                    };

                    if (stream) {
                        stream.getTracks().forEach((track) => {
                            con.addTrack(track, stream); //should trigger negotiationneeded event
                        });

                        h.setLocalStream(stream);
                        setMyStream(stream);

                        //create offer
                        if (createOffer) {
                            con.onnegotiationneeded = async () => {
                                let offer = await con.createOffer({ offerToReceiveAudio: true, offerToReceiveVideo: true });

                                await con.setLocalDescription(offer);
                                socket.emit('sdp', {
                                    description: con.localDescription,
                                    to: partnerName,
                                    sender: id,
                                });
                            };
                        }
                    }
                } catch (error) {
                    console.error('initNewUser', error);
                }
                return null;
            }
        } catch (error) {
            console.error('Socket connect error = ', error);
        }

        return () => {
            socket.off('connect');
            socket.off('disconnect');
            socket.off('sdp');
            socket.off('ice candidates');
            socket.off('newUserStart');
            socket.off('room');
            socket.off('disconnect room');
        };
    }, [myPc, guestPC]);

    const switchToggle = (index: boolean) => {
        setPanel(Number(index));
    }

    return (
        <>
            <Navbar  {...{ host: myPc, partner: guestPC[0], socket: socket }} onToggle={(key: string) => toggleAction(key)} disconnect={(id: string) => { disConnect(id) }} onSetting={(index: number, type: string) => { changeSetting(index, type) }} />
            <main className='home'>
                <div className="main">
                    <div className='main-board'>
                        {/* <Video {...{ name: '', type: 'main', }} /> */}
                        {
                            guestPC.length > 0 ?
                                <Video {...{ name: guestPC[0].first_name, type: 'guest' }} />
                                : <></>
                        }
                        <Video {...{ name: 'You', type: 'host', }} onSwitchToggle={(index: boolean) => switchToggle(index)} />
                    </div>
                </div>
            </main>
        </>
    )
}

export default Home;