import React, { useEffect, useState } from 'react';
import {
    FaCog,
    FaMicrophone,
    FaMicrophoneSlash,
    FaVideo,
    FaVideoSlash,
    FaPhone,
    FaUserPlus,
    FaDesktop
} from 'react-icons/fa';

import {
    BsFillChatRightDotsFill,
    BsRecordCircle
} from 'react-icons/bs'

import { IUser, IPc, IKunnec, IActive } from '../../type';

import './index.scss';

type toggleFunction = (type: string) => void;
type disconnectFunction = (id: string) => void;
type onSettingFunction = (index: number, type: string) => void;

interface IProps {
    onToggle: toggleFunction;
    disconnect: disconnectFunction;
    onSetting: onSettingFunction;
    host: IUser;
    partner: IPc[];
    users: IKunnec[];
}

const Navbar = (props: IProps) => {
    const [spotCode, setSpotCode] = useState<string>('');
    const [activeButton, setActiveButton] = useState<IActive>(
        {
            contact: false,
            setting: false,
            invite: false,
            audio: true,
            video: true
        });
    const [videoList, setVideoList] = useState<any[]>([]);
    const [inputAudioList, setInputAudioList] = useState<any[]>([]);
    const [outputAudioList, setOutputAudioList] = useState<any[]>([]);

    const room = window.location.hash.split('#')[1];

    const changeActive = (key: string) => {
        const active = { ...activeButton }
        active[key] = !active[key];
        if (key === 'audio' || key === 'video') {
            props.onToggle(key);
        }
        setActiveButton(active);
    }

    const inviteKunnec = (id: number, kunnecId: number, userId: number) => {
        const requestOptions = {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                kunnec_id: kunnecId,
                sender: props.host.id,
                receiver: userId,
                spot_id: room
            })
        }

        fetch('https://kunnec.com/api/send-invite', requestOptions)
            .then(response => response.json())
            .then(data => {
                // Store.addNotification({
                //     title: "Success",
                //     message: `Invite sent to ${props.users[id].first_name} ${props.users[id].last_name}`,
                //     type: "success",
                //     insert: "top",
                //     container: "top-right",
                //     animationIn: ["animate__animated", "animate__fadeIn"],
                //     animationOut: ["animate__animated", "animate__fadeOut"],
                //     dismiss: {
                //         duration: 5000,
                //         onScreen: true
                //     }
                // });
            }).catch(error => {
                console.error(error);
            });
    }

    const getDevices = async () => {
        const devices = await navigator.mediaDevices.enumerateDevices();

        const _videoList = devices.filter(device => device.kind === 'videoinput');
        const _audioInputList = devices.filter(device => device.kind === 'audioinput');
        const _audioOutputList = devices.filter(device => device.kind === 'audiooutput');

        setVideoList(_videoList);
        setInputAudioList(_audioInputList);
        setOutputAudioList(_audioOutputList);
    }

    const selectOption = (type: string, e: any) => {
        props.onSetting(e.target.value, type);
    }

    const urlString = (url: string) => {
        return url.slice(0, 18) + '/public' + url.slice(18);
    }

    useEffect(() => {
        setSpotCode(room);
        getDevices();
    }, [])
    return (
        <>
            <nav>
                <img src='image/logo.png' alt="logo" />
                <div>
                    <div className="x-code">
                        <div>
                            <img src={props.host.image} alt="user" />
                            <span className='spot-name'>{props.host.username} session</span>
                        </div>
                        <p>00:00:00</p>
                    </div>
                    <div className="x-btn x-controller">
                        <span onClick={() => { changeActive('contact') }}>
                            <BsFillChatRightDotsFill />
                        </span>
                        <span onClick={() => { changeActive('contact') }}>
                            <FaDesktop />
                        </span>
                        <span onClick={() => { changeActive('audio') }}>{activeButton.audio ? <FaMicrophone /> : <FaMicrophoneSlash />}</span>
                        <span onClick={() => { changeActive('video') }}>{activeButton.video ? <FaVideo /> : <FaVideoSlash />}</span>
                        <span onClick={() => { changeActive('setting') }}>
                            <FaCog />
                        </span>
                        <span className='' onClick={() => { changeActive('video') }}><BsRecordCircle /></span>
                        {/* <span className="active" onClick={() => window.location.href = '/public/k_spot/k_spot'}>
                            <FaPhone />
                        </span> */}

                        <button className='active exit-btn'>Exit Session</button>
                    </div>
                </div>
            </nav>
            <div className={`modal left ${activeButton.contact ? "show" : ''}`}>
                <div className='overlay' onClick={() => changeActive('contact')}></div>
                <div className="modal-content">
                    <div className="modal-body">
                        <h1>Kunnecs</h1>
                        <button onClick={() => changeActive('invite')}><FaUserPlus /> Invite Kunnecs</button>
                        <div className="user-panel">
                            <div>
                                <img src={urlString(props.host.image)} alt="user" />
                                <p>{`${props.host.first_name} ${props.host.last_name}`}: Spot Host</p>
                            </div>
                        </div>
                        <hr />
                        <p >Joined Carlo Spot: {props.partner.length}</p>
                        <div className="user-group">
                            {
                                props.partner.map((ele, ind) => (
                                    <div className="user-panel" key={ind}>
                                        <div>
                                            <img src={urlString(ele.image)} alt="user" />
                                            <p>{`${ele.first_name} ${ele.last_name}`}</p>
                                        </div>
                                        <button onClick={() => props.disconnect(ele.clientId)}>DisKunnec</button>
                                    </div>
                                ))
                            }
                        </div>
                    </div>
                    <div className="modal-footer">
                        <button onClick={() => { changeActive('contact') }}>Close</button>
                    </div>
                </div>
            </div>
            <div className={`modal top ${activeButton.invite ? "show" : ''}`}>
                <div className='overlay' onClick={() => changeActive('invite')}></div>
                <div className="modal-content">
                    <div className="modal-body">
                        <h1>Invite Kunnec</h1>
                        <div className="user-group">
                            {
                                props.users.map((ele: any, ind: number) => (
                                    <div className="user-panel" key={ind}>
                                        <div>
                                            <img src={`https://kunnec.com/public/user-dash/images/users/profiles/${ele.image}`} alt="user" />
                                            <p>{`${ele.first_name} ${ele.last_name}`}</p>
                                        </div>
                                        <button className='btn-invite' onClick={() => { inviteKunnec(ind, ele.id, ele.user_id) }} >invite</button>
                                    </div>
                                ))
                            }
                        </div>
                    </div>
                    <div className="modal-footer">
                        <button onClick={() => { changeActive('invite') }}>Close</button>
                    </div>
                </div>
            </div>
            <div className={`modal right ${activeButton.setting ? "show" : ''}`}>
                <div className='overlay' onClick={() => changeActive('setting')}></div>
                <div className="modal-content">
                    <div className="modal-body">
                        <h1>Settings</h1>
                        <p>Camera</p>
                        <select onChange={(e) => selectOption('video', e)}>
                            {
                                videoList.map((ele) => (
                                    <option key={ele.deviceId} value={ele.deviceId} >{ele.label}</option>
                                ))
                            }
                        </select>
                        <p>Microphone</p>
                        <select onChange={(e) => selectOption('audioInput', e)}>
                            {
                                inputAudioList.map((ele) => (
                                    <option key={ele.deviceId} value={ele.deviceId}>{ele.label}</option>
                                ))
                            }
                        </select>
                    </div>
                    <div className="modal-footer">
                        <button onClick={() => { changeActive('setting') }}>Close</button>
                    </div>
                </div>
            </div>
        </>
    );
};

export default Navbar;
