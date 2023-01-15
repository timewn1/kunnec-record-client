import React from "react";
import { BsFillFileEarmarkCheckFill, BsDownload } from "react-icons/bs";

import Utills from '../../lib/utills.js';

import { IMessage } from "../../type";

import './index.scss';

interface IProps {
    data: IMessage,
    myId: string
}

export const ChatElement = (props: IProps) => {
    return <div className={`chat-element ${props.data.user_id === props.myId ? 'right' : 'left'}`}>
        <p className="time">{Utills.convertTime(props.data.time)}</p>
        <div>
            {
                props.data.isFile ?
                    <>
                        <BsFillFileEarmarkCheckFill />
                        {Utills.recudeFileName(props.data.content)}
                        <a target='_blank' href={`http://localhost:3001/download?uploaded=${props.data.uploadedName}&name=${props.data.content}`} download>
                            <BsDownload />
                        </a>
                    </> :
                    props.data.content
            }
        </div>
    </div>
}