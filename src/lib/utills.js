export default {
    convertTime: (d) => {
        const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
        const localTime = d.toLocaleString('en-US', { timeZone: timezone });
        const newDate = new Date(localTime);
        return newDate.getHours() + ':' + newDate.getMinutes();
    },

    urlString: (url) => {
        return url.slice(0, 18) + '/public' + url.slice(18);
    },

    recudeFileName: (url) => {
        if (url.length > 25) return url.slice(0, 22) + '...';
        else return url;
    },

    convertTrackingTime: (time) => {
        const h = Math.floor(time / 3600);
        const m = Math.floor((time % 3600) / 60);
        const s = time % 60;

        return (h < 10 ? '0' + h : h) + ':' + (m < 10 ? '0' + m : m) + ':' + (s < 10 ? '0' + s : s);
    }

}