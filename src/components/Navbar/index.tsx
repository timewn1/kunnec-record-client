import React, { useEffect, useState, useRef } from 'react';
import { Store } from 'react-notifications-component';
import {
    FaCog,
    FaVideo,
    FaDesktop,
    FaVideoSlash,
    FaMicrophone,
    FaMicrophoneSlash,
} from 'react-icons/fa';
import {
    BsXLg,
    // BsRecordCircle,
    BsFillChatRightDotsFill,
    BsFillFileEarmarkCheckFill
} from 'react-icons/bs';
import { BiSend } from 'react-icons/bi';
import { ImAttachment } from 'react-icons/im';

import Utills from '../../lib/utills.js';

import { IPc, IActive, IMessage } from '../../type';

import { ChatElement } from '../ChatElement';

import './index.scss';


type toggleFunction = (type: string) => void;
type onSettingFunction = (index: number, type: string) => void;
type screenSharingFunction = () => void;

interface IProps {
    onToggle: toggleFunction;
    screenSharing: screenSharingFunction;
    onSetting: onSettingFunction;
    host: IPc | null;
    partner: IPc[];
    socket: any;
}

const Navbar = (props: IProps) => {
    const [time, setTime] = useState<number>(0);
    const [badge, setBadge] = useState<boolean>(false);
    const [chatText, setChatText] = useState<string>('');
    const [fileName, setFileName] = useState<string>('');
    const [chatList, setChatList] = useState<IMessage[]>([]);
    const [videoList, setVideoList] = useState<any[]>([]);
    const [uploading, setUploading] = useState<boolean>(false);
    const [inputAudioList, setInputAudioList] = useState<any[]>([]);
    const [activeButton, setActiveButton] = useState<IActive>(
        {
            exit: false,
            setting: false,
            chat: false,
            audio: true,
            video: true
        });

    const fileRef = useRef<HTMLInputElement>(null);
    const chatRef = useRef<HTMLTextAreaElement>(null);
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const fileDisplayRef = useRef<HTMLDivElement>(null);

    const room = window.location.hash.split('#')[1];

    const changeActive = (key: string) => {
        const active = { ...activeButton }
        active[key] = !active[key];
        if (key === 'audio' || key === 'video') {
            props.onToggle(key);
        }
        setActiveButton(active);
        if (key === 'chat' && badge) {
            setBadge(false);
        }
    }

    // const recording = () => {

    // }

    const getDevices = async () => {
        const devices = await navigator.mediaDevices.enumerateDevices();

        const _videoList = devices.filter(device => device.kind === 'videoinput');
        const _audioInputList = devices.filter(device => device.kind === 'audioinput');
        const _audioOutputList = devices.filter(device => device.kind === 'audiooutput');

        setVideoList(_videoList);
        setInputAudioList(_audioInputList);
    }

    const selectOption = (type: string, e: any) => {
        props.onSetting(e.target.value, type);
    }

    const changeText = (e: any) => {
        const text = e.target.value;

        if (text.length > 25 || text.split('\n').length >= 2) {
            if (chatRef.current)
                chatRef.current.style.height = '2.7em';
        }

        if (text.length < 25 && text.split('\n').length < 2) {
            if (chatRef.current)
                chatRef.current.style.height = '1.5em';
        }

        setChatText(text)
    }

    const sendMessage = async () => {
        if (!props.host) return;

        if (fileName !== '') {
            if (fileRef.current && fileRef.current.files) {
                if (props.partner.length > 0) {
                    const uploadedName = new Date().valueOf().toString();
                    const data = {
                        time: new Date(),
                        isFile: true,
                        content: fileName,
                        user_id: props.host.clientId,
                        userName: props.host.username,
                        uploadedName: uploadedName,
                    }

                    let formData = new FormData();

                    formData.append('name', uploadedName);
                    formData.append('file', fileRef.current.files[0]);

                    try {
                        setUploading(true);
                        const res = await fetch('https://record.kunnec.com/upload', {
                            method: 'POST',
                            body: formData
                        })

                        const result = await res.json();

                        if (result.state) {
                            props.socket.emit('sendChat', {
                                content: data,
                                to: room
                            });

                            setChatList([...chatList, data]);
                        } else {
                            Store.addNotification({
                                title: 'Failed!',
                                message: 'File transfer is failed',
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
                    } catch (err) {
                        console.error(err);
                    }
                    setUploading(false);
                    removeFile();
                }
            }
        }
        else {
            let txt = chatText.replaceAll("\n\n", "");

            if (txt && txt !== '\n') {
                const data = {
                    time: new Date(),
                    content: chatText,
                    user_id: props.host.clientId,
                    userName: props.host.username,
                    isFile: false,
                }

                if (props.partner.length > 0) {
                    props.socket.emit('sendChat', {
                        content: data,
                        to: room
                    });
                }

                setChatList([...chatList, data]);
                setChatText('');

                if (chatRef.current)
                    chatRef.current.style.height = '1.5em';
            }
        }
        chatRef.current?.focus();
    }

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({
            behavior: 'smooth',
            block: 'start',
        })
    }

    const uploadFile = () => {
        if (fileRef.current && fileRef.current.files) {
            if (fileRef.current.files[0].size > 104856700) {
                alert('File is too big!');
                fileRef.current.value = '';
                return;
            }
            setFileName(fileRef.current.files[0].name);

            if (chatRef.current)
                chatRef.current.style.display = 'none';
            if (fileDisplayRef.current)
                fileDisplayRef.current.style.display = 'flex';
        }
    }

    const removeFile = () => {
        setFileName('');
        if (fileRef.current)
            fileRef.current.value = '';

        if (chatRef.current)
            chatRef.current.style.display = 'block';
        if (fileDisplayRef.current)
            fileDisplayRef.current.style.display = 'none';
    }

    useEffect(() => {
        getDevices();

        // chatRef.current?.addEventListener('dragover', (event) => {
        //     if (chatRef.current)
        //         chatRef.current.style.border = '1px solid white';
        // })

        // chatRef.current?.addEventListener('dragleave', (event) => {
        //     if (chatRef.current)
        //         chatRef.current.style.border = 'none';
        // })

        // return () => {
        //     chatRef.current?.removeEventListener('dragover', () => { });
        //     chatRef.current?.removeEventListener('dragleave', () => { });
        // }

        const timeInterval = setInterval(() => {
            setTime(prev => prev + 1);
        }, 1000);

        return () => {
            clearInterval(timeInterval);
            chatRef.current?.removeEventListener('keyup', () => { });
        }
    }, []);

    useEffect(() => {
        setTimeout(() => {
            scrollToBottom()
        }, 100);

        props.socket.on('receiveChat', (data: any) => {
            setChatList([...chatList, data.data]);
            setBadge(true);
        })

        return () => {
            props.socket.off('receiveChat');
        }
    }, [chatList])
    return (
        <>
            <nav>
                <img src="image/logo.png" alt="logo" />
                <div>
                    <div className="x-code">
                        <div>
                            <img src={Utills.urlString(props.host?.image)} alt="user" />
                            <span className="spot-name">{props.host?.username} session</span>
                        </div>
                        <p>{Utills.convertTrackingTime(time)}</p>
                    </div>
                    <div className="x-btn x-controller">
                        <span onClick={() => changeActive('chat')}>
                            <BsFillChatRightDotsFill />
                            {
                                badge ? <span className="badge" ></span> : <></>
                            }
                        </span>
                        <span onClick={() => props.screenSharing()} ><FaDesktop /></span>
                        <span onClick={() => changeActive('audio')}>{activeButton.audio ? <FaMicrophone /> : <FaMicrophoneSlash />}</span>
                        <span onClick={() => changeActive('video')}>{activeButton.video ? <FaVideo /> : <FaVideoSlash />}</span>
                        <span onClick={() => changeActive('setting')}><FaCog /></span>
                        {/* <span onClick={recording}><BsRecordCircle /></span> */}
                    </div>
                    <button className="active exit-btn" onClick={() => changeActive('exit')}>Exit&nbsp;Session</button>
                </div>
            </nav>
            <div className={`modal left ${activeButton.chat ? "show" : ""}`} onClick={() => setBadge(false)}>
                <div className="modal-content">
                    <div className="modal-header">
                        <span onClick={() => { changeActive('chat') }}><BsXLg /></span>
                    </div>
                    <div className="modal-body">
                        <div>
                            {
                                chatList.map((ele, index) => (
                                    <ChatElement key={index} {...{ data: ele, myId: props.host?.clientId + '' }} />
                                ))
                            }
                        </div>
                        <div ref={messagesEndRef}></div>
                    </div>
                    <div className="modal-footer">
                        <textarea
                            className="chat-box"
                            placeholder="Type a message"
                            ref={chatRef}
                            value={chatText}
                            onChange={(e) => changeText(e)}
                            onKeyDown={(e) => {
                                if (e.key == 'Enter' && !e.shiftKey) {
                                    sendMessage();
                                    e.preventDefault();
                                }
                            }}
                        />
                        <div ref={fileDisplayRef} className="file-element" ><BsFillFileEarmarkCheckFill />&nbsp;{Utills.recudeFileName(fileName)}
                            {
                                !uploading ? <span onClick={removeFile}><BsXLg /></span> :
                                    <span className="spin" role="progressbar">
                                        <svg viewBox="22 22 44 44">
                                            <circle cx="44" cy="44" r="20.2" fill="none" stroke-width="3.6"></circle>
                                        </svg>
                                    </span>
                            }
                        </div>
                        <span className="chat-send-btn" onClick={() => sendMessage()}><BiSend /></span>
                        <span onClick={() => { fileRef.current?.click(); }}><ImAttachment /></span>
                        <input type="file" ref={fileRef} onChange={() => uploadFile()} />
                    </div>
                </div>
            </div>
            <div className={`modal center ${activeButton.exit ? "show" : ''}`}>
                <div className="modal-content">
                    <div className="modal-footer">
                        <h1>Do you want to exit this session?</h1>
                        <div className="btn-group">
                            <button className="active" onClick={() => window.location.href = 'https://kunnec.com/public/k_screen/recording/record_details'}>Yes</button>
                            <button onClick={() => changeActive('exit')}>No</button>
                        </div>
                    </div>
                </div>
            </div>
            <div className={`modal right ${activeButton.setting ? "show" : ''}`}>
                <div className="overlay" onClick={() => changeActive('setting')}></div>
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
