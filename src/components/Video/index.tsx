import React from 'react';

import './index.scss';

interface IProps {
    name: string;
    partnerName: string;
    host: boolean;
}

const Video = (props: IProps) => {
    return (
        <div className="video-ele" id={`video-${props.partnerName}`}>
            {
                props.host ?
                    <video poster='image/spot_bg_mirror.png' autoPlay={true} muted className='videoElement mirror-mode v-cover' id={`videoElement-${props.partnerName}`} />
                    :
                    <video poster='image/spot_bg.png' autoPlay={true} className='videoElement v-cover' id={`videoElement-${props.partnerName}`} />
            }
            <div className="controller">
            </div>
        </div>
    )
}

export default Video;