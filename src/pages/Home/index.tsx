import React, { useEffect, useLayoutEffect, useState } from 'react';
// import { Store } from 'react-notifications-component';

import { IPc, IKunnec, ISetting, IToggle } from '../../type/index.js';

import h from '../../lib/helpers.js';

import Video from '../../components/Video';
import Navbar from '../../components/Navbar';

import './index.scss';

const socketIOClient = require('socket.io-client');
const ENDPOINT = "https://spot.kunnec.com/stream";

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
    const [pc, setPc] = useState<IPc[]>([]);
    const [myStream, setMyStream] = useState<any>();
    const [users, setUsers] = useState<IKunnec[]>([]);
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

    const setMedia = async (id: string) => {
        const _myStream = await h.getUserFullMedia(setting);
        h.setLocalStream(_myStream, id);
        setMyStream(_myStream);
        return _myStream;
    }

    const broadcastNewTracks = (stream: any, type: string) => {
        let track: any;
        h.setLocalStream(stream);

        if (pc.length > 0) {
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
            myStream.getAudioTracks()[0].enabled = _toggle.audio;
            myStream.getVideoTracks()[0].enabled = _toggle.video;

            broadcastNewTracks(myStream, 'audio');
            broadcastNewTracks(myStream, 'video');
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

        h.setLocalStream(stream, sId);

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
        // const res = await fetch('https://kunnec.com/api/get-info');
        // const json = await res.json();
        // const auth = json.authorization;
        // const _users = json.users;

        // if (auth === 'fail') {
        //     window.location.href = '/public/login';
        // }

        // const u = {
        //     clientId: sId,
        //     id: auth['id'],
        //     first_name: auth['first_name'],
        //     last_name: auth['last_name'],
        //     username: auth['username'],
        //     gender: auth['gender'],
        //     image: auth['image'],
        // }

        const u = {
            clientId: 'clientId',
            id: 0,
            first_name: 'Calor',
            last_name: 'Brown',
            username: 'Calor',
            gender: 0,
            image: 'image/user.jpg',
        }

        // setUsers(_users);
        return u;
    }

    useEffect(() => {
        const navHeight = document.getElementsByTagName('nav')[0].offsetHeight;
        // const footerHeight = document.getElementsByTagName('footer')[0].offsetHeight;
        const mainHeight = height - navHeight;

        h.adjustVideoSize('video-ele', width, mainHeight, pc.length + 1);

    }, [width, height, pc]);

    useEffect(() => {
        try {
            const myId = socket.io.engine.id;

            socket.on('connect', async () => {
                const myId = socket.io.engine.id;
                console.log('socket Id = ', myId);

                const _myPc = await getUserAuth();

                setMedia(myId);
                setSId(myId);
                setMyPc(_myPc);

                socket.emit('subscribe', {
                    room: room,
                    socketId: myId,
                    userData: _myPc,
                });
            });

            socket.on('room', async (data: any) => {
                setPc([...pc, data.user]);

                await initNewUser(false, myId, data.socketId, (con) => window.socketPc[data.socketId] = con);

                socket.emit('newUserStart', {
                    to: data.socketId,
                    sender: myId,
                    user: { ...myPc, clientId: myId },
                });

                // Store.addNotification({
                //     title: "Info!",
                //     message: `${data.user.first_name} ${data.user.last_name} joined the Room`,
                //     type: "info",
                //     insert: "top",
                //     container: "top-right",
                //     animationIn: ["animate__animated", "animate__fadeIn"],
                //     animationOut: ["animate__animated", "animate__fadeOut"],
                //     dismiss: {
                //         duration: 5000,
                //         onScreen: true
                //     }
                // });
            });

            socket.on('newUserStart', async (data: any) => {
                setPc([...pc, data.user]);
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
                const _data = pc.filter((ele: any) => ele.clientId !== data.clientId);
                const deleted_user = pc.filter((ele: IPc) => ele.clientId === data.clientId);

                delete window.socketPc[data.clientId];

                // Store.addNotification({
                //     message: `${deleted_user[0]?.first_name} ${deleted_user[0]?.last_name} left the Room`,
                //     type: "danger",
                //     insert: "top",
                //     container: "top-right",
                //     animationIn: ["animate__animated", "animate__fadeIn"],
                //     animationOut: ["animate__animated", "animate__fadeOut"],
                //     dismiss: {
                //         duration: 7000,
                //         onScreen: true
                //     }
                // });
                setPc(_data);
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
                        const elem = document.getElementById(`videoElement-${partnerName}`) as any;
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

                        h.setLocalStream(stream, id);
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
    }, [myPc, pc]);

    return (
        <>
            <Navbar  {...{ host: myPc, partner: pc, users: users }} onToggle={(key: string) => toggleAction(key)} disconnect={(id: string) => { disConnect(id) }} onSetting={(index: number, type: string) => { changeSetting(index, type) }} />
            <main className='home'>
                <div className="main">
                    <div className='main-board'>
                        {pc.map((ele) => (
                            <Video key={ele.clientId} {...{ name: ele.first_name, partnerName: ele.clientId, host: false }} />
                        ))}
                        <Video {...{ name: myPc.first_name, partnerName: sId, host: true }} />
                    </div>
                </div>
            </main>
        </>
    )
}

export default Home;