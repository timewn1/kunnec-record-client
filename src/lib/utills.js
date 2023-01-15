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
    }

}