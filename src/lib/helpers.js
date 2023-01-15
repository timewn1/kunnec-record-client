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

    setLocalStream(stream) {
        const mainVideoEle = document.getElementById('host');

        if (mainVideoEle) {
            mainVideoEle.srcObject = stream;
        }
    },

    async screenSharing() {
        try {
            const video = document.getElementById('main');
            const options = { audio: false, video: true };

            if (window.adapter.browserDetails.browser === 'firefox') {
                window.adapter.browserShim.shimGetDisplayMedia(window, 'screen');
            }

            const screenStream = await navigator.mediaDevices.getDisplayMedia(options);

            screenStream.getVideoTracks()[0].addEventListener('ended', () => {
                console.log('The user has ended sharing the screen');
            });
            if (video)
                video.srcObject = stream;

            return screenStream;
        }
        catch {
            err => console.error(err);
        }
    },

    adjustVideoSize(className, width, height, count, panel) {
        const min_separate = 10;
        const elements = document.getElementsByClassName(className);
        const guestElement = document.getElementById('video-guest');
        const hostElement = document.getElementById('video-host');
        const mainElement = document.getElementById('video-main');

        if (count === 1) {
            hostElement.style.width = width + 'px';
            hostElement.style.height = height + 'px';
            hostElement.style.top = '0px';
            hostElement.style.left = '0px';
            hostElement.style.overflow = 'visible';
            hostElement.childNodes[1].childNodes[0].classList.remove('dragable');
            return;
        }

        if (panel === 1) {
            guestElement.style.width = width + 'px';
            guestElement.style.height = height + 'px';
            guestElement.style.top = '0px';
            guestElement.style.left = '0px';
            guestElement.style.overflow = 'visible';
            hostElement.childNodes[1].childNodes[0].classList.remove('dragable');

            hostElement.style.width = width / 6 + 'px';
            hostElement.style.height = width / 6 * 5 / 8 + 'px';
            hostElement.style.top = height - height / 20 - width / 6 * 5 / 8 + 'px';
            hostElement.style.left = width - 30 - width / 6 + 'px';
            hostElement.childNodes[1].childNodes[0].classList.add('dragable');
            hostElement.style.overflow = 'hidden';
        }

        if (panel === 0) {
            hostElement.style.overflow = 'hidden';
            guestElement.style.overflow = 'hidden';

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
                    elements[index].childNodes[1].childNodes[0].classList.remove('dragable');
                }
            }
        }
    }



    /**
     * @param {MediaProvider} str
     */
};
