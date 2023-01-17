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
        const hostVideoElement = document.getElementById('host');

        if (hostVideoElement) {
            hostVideoElement.srcObject = stream;
        }
    },

    setScreenStream(stream) {
        const screenElement = document.getElementById('screen');
        if (screenElement)
            screenElement.srcObject = stream;
    },

    async screenSharing() {
        try {
            const options = { audio: false, video: true };

            if (window.adapter.browserDetails.browser === 'firefox') {
                window.adapter.browserShim.shimGetDisplayMedia(window, 'screen');
            }
            const screenStream = await navigator.mediaDevices.getDisplayMedia(options);

            return screenStream;
        }
        catch (error) {
            console.error(error);
        }
    },

    adjustVideoSize(width, height, guest, panel, shared) {
        let elements = [];
        const min_separate = 10;

        const hostElement = document.getElementById('video-host');
        const guestElement = document.getElementById('video-guest');
        const screenElement = document.getElementById('video-screen');
        const screenVideoElement = document.getElementById('screen');

        if (shared) {
            elements.push(screenElement);
            screenElement.style.display = 'block';
        }
        else {
            screenElement.style.display = 'none';
        }

        if (guest > 0) elements.push(guestElement);
        elements.push(hostElement);

        const count = elements.length;

        if (count === 1) {
            hostElement.style.width = width + 'px';
            hostElement.style.height = height + 'px';
            hostElement.style.top = '0px';
            hostElement.style.left = '0px';
            hostElement.style.border = 'none';
            hostElement.style.overflow = 'visible';
            hostElement.childNodes[1].childNodes[0].classList.remove('dragable');
            return;
        }

        if (!panel) {
            if (shared) {
                screenElement.style.width = width + 'px';
                screenElement.style.height = height + 'px';
                screenElement.style.top = '0px';
                screenElement.style.left = '0px';
                screenElement.style.border = 'none';
                screenElement.style.overflow = 'visible';
                screenElement.childNodes[1].childNodes[0].classList.remove('dragable');

                screenVideoElement.style.maxWidth = width + 'px';
                screenVideoElement.style.maxHeight = height + 'px';

                if (guest > 0) {
                    guestElement.style.width = width / 6 + 'px';
                    guestElement.style.height = width / 6 * 5 / 8 + 'px';
                    guestElement.style.top = height / 20 + 'px';
                    guestElement.style.left = width - 30 - width / 6 + 'px';
                    guestElement.style.border = '1px solid #328132';
                    guestElement.style.overflow = 'hidden';
                    guestElement.childNodes[1].childNodes[0].classList.add('dragable');
                }
            }
            else {
                if (guest > 0) {
                    guestElement.style.width = width + 'px';
                    guestElement.style.height = height + 'px';
                    guestElement.style.top = '0px';
                    guestElement.style.left = '0px';
                    guestElement.style.border = 'none';
                    guestElement.style.overflow = 'visible';
                    guestElement.childNodes[1].childNodes[0].classList.remove('dragable');
                }
            }
            hostElement.style.width = width / 6 + 'px';
            hostElement.style.height = width / 6 * 5 / 8 + 'px';
            hostElement.style.top = height - height / 20 - width / 6 * 5 / 8 + 'px';
            hostElement.style.left = width - 30 - width / 6 + 'px';
            hostElement.style.border = '1px solid #328132';
            hostElement.style.overflow = 'hidden';
            hostElement.childNodes[1].childNodes[0].classList.add('dragable');
        }

        if (panel) {
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

            if (shared) {
                screenVideoElement.style.maxWidth = realWidth + 'px';
                screenVideoElement.style.maxHeight = realHeight + 'px';
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
                    elements[index].style.overflow = 'hidden';
                    elements[index].style.border = '1px solid #328132';
                    elements[index].childNodes[1].childNodes[0].classList.remove('dragable');
                }
            }
        }
    }

    /**
     * @param {MediaProvider} str
     */
};