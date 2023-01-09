export default {
    userMediaAvailable() {
        return !!(
            navigator.getUserMedia ||
            navigator.webkitGetUserMedia ||
            navigator.mozGetUserMedia ||
            navigator.msGetUserMedia
        );
    },

    getUserFullMedia(setting) {
        const audioSource = setting.audioInput;
        const videoSource = setting.video;
        const constraints = {
            audio: { deviceId: audioSource ? { exact: audioSource } : undefined },
            video: { deviceId: videoSource ? { exact: videoSource } : undefined }
        };
        if (this.userMediaAvailable()) {
            return navigator.mediaDevices.getUserMedia(constraints);
        } else {
            alert('User Media not Available');
        }
    },

    getIceServer() {
        return {
            iceServers: [
                {
                    urls: "turn:openrelay.metered.ca:80",
                    username: "openrelayproject",
                    credential: "openrelayproject",
                },
                {
                    urls: "turn:openrelay.metered.ca:443",
                    username: "openrelayproject",
                    credential: "openrelayproject",
                },
            ],
        };
    },

    replaceTrack(stream, recipientPeer) {
        if (recipientPeer.getSenders) {
            let sender = recipientPeer.getSenders().find((s) => s.track && s.track.kind === stream.kind);
            if (sender) sender.replaceTrack(stream)
        }
    },

    setLocalStream(stream, id) {
        const localVidElem = document.getElementById(`videoElement-${id}`);
        if (localVidElem) {
            localVidElem.srcObject = stream;
        }
    },

    adjustVideoSize(className, width, height, count) {
        const min_separate = 10;
        const elements = document.getElementsByClassName(className);

        if (count === 1) {
            elements[0].style.width = width + 'px';
            elements[0].style.height = height + 'px';
            elements[0].style.top = '0px';
            elements[0].style.left = '0px';
            elements[0].style.overflow = 'visible';
            return;
        }
        elements[count - 1].style.overflow = 'hidden';

        let rest_space_min = width * height,
            suitable_widthcount = 0,
            suitable_heightcount = 0;

        for (let i = 1; i <= count; i++) {
            let widthcount, heightcount = i;
            if (count % i == 0) {
                widthcount = parseInt(count / i);
            } else {
                widthcount = parseInt(count / i) + 1;
            }

            let cell_width = width / widthcount;
            let cell_height = height / heightcount;
            let width_height = cell_width > cell_height ? cell_height : cell_width;
            let rest_space = width * height - count * width_height * width_height;

            if (rest_space < rest_space_min) {
                rest_space_min = rest_space;
                suitable_heightcount = heightcount;
                suitable_widthcount = widthcount;
            }
        }

        let realTotalWidth = width - min_separate * (suitable_widthcount + 1),
            realTotalHeight = height - min_separate * (suitable_heightcount + 1),
            diffWidth = 0,
            diffHeight = 0,
            realWidth = realTotalWidth / suitable_widthcount,
            realHeight = realTotalHeight / suitable_heightcount;

        if (realWidth > realHeight * 8 / 5) {
            diffWidth = realWidth * suitable_widthcount - realHeight * suitable_widthcount * 8 / 5;
            realWidth = realHeight * 8 / 5;
        }
        else if (realHeight > realWidth * 5 / 8) {
            diffHeight = realHeight * suitable_heightcount - realWidth * suitable_heightcount * 5 / 8;
            realHeight = realWidth * 5 / 8;
        }

        for (let i = 0; i < suitable_heightcount; i++) {
            for (let j = 0; j < suitable_widthcount; j++) {
                const index = suitable_widthcount * i + j;
                if (index >= count) {
                    return;
                }

                let top = (i + 1) * min_separate + diffHeight / 2 + realHeight * i;
                let left = (j + 1) * min_separate + diffWidth / 2 + realWidth * j;
                if (i === (suitable_heightcount - 1) && suitable_heightcount * suitable_widthcount > count) {
                    left = left + (suitable_heightcount * suitable_widthcount - count) * (realWidth + min_separate) / 2;
                }

                elements[index].style.width = realWidth + 'px';
                elements[index].style.height = realHeight + 'px';
                elements[index].style.top = top + 'px';
                elements[index].style.left = left + 'px';
            }
        }
    }

    /**
     * @param {MediaProvider} str
     */
};
