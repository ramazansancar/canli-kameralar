const axios = require('axios');
const https = require('https');
const fs = require('fs');

axios.defaults.httpsAgent = new https.Agent({ rejectUnauthorized: false });

const replaceTurkishCharacters = (text) => {
    if(!text) return null;
    text = text.replace('ı','i');
    text = text.replace('İ','I');
    text = text.replace('ç','c');
    text = text.replace('Ç','C');
    text = text.replace('ş','s');
    text = text.replace('Ş','S');
    text = text.replace('ğ','g');
    text = text.replace('Ğ','G');
    text = text.replace('ü','u');
    text = text.replace('Ü','U');
    text = text.replace('ö','o');
    text = text.replace('Ö','O');
    text = text.replace(' ','-');
    return text;
};

const nameGenerator = (name) => {
    if(!name) return null;
    name = replaceTurkishCharacters(name);
    return name.replace(/[^a-zA-Z0-9]/g, '-').replace('---','-').toLowerCase();
};

const m3uGenerator = (name, url, resolution = null) => {
    if(!url) return null;
    // #EXTINF:-1 tvg-id="ist-Anadolu-Hisarı.tr" tvg-logo="" group-title="Anadolu Hisarı", İstanbul - Anadolu Hisarı (576p)
    if(!resolution) return `#EXTINF:-1,${name}\n${url}\n`;
    return `#EXTINF:-1 tvg-id="${nameGenerator(name)}" tvg-logo="" group-title="${name}", ${name} (${resolution.height}p)\n${url}\n`;
};

const resolutionConverter = (text) => {
    if(!text) return null;
    // #EXT-X-STREAM-INF:BANDWIDTH=1106708,CODECS="avc1.100.30",RESOLUTION=704x576
    let resolutionArray = text.split('RESOLUTION=')[1].split('x');
    let resolutionObject = {
        width: resolutionArray[0],
        height: resolutionArray[1]
    };
    return resolutionObject;
};

const getStreamStatus = async (url) => {
    return await axios.get(url,{
        timeout: 15000,
        headers: {
            'Access-Control-Allow-Origin': '*',
            'Content-Type': 'application/json',
        }
    })
    .then((response) => {
        return {
            url: url,
            status: response.status,
            resolution: resolutionConverter(response.data.split('\n')[2]),
            response: response.data
        };
    })
    .catch((error) => {
        return {
            url: url,
            status: error.response.status,
            resolution: resolutionConverter(error.response.data.split('\n')[2]),
            response: error.response.data
        };
    });
};

(async () => {
    let status = [];
    let streamStatus = {};
    let backupStreamStatus = {};

    let urlList = fs.readFileSync('list.json', 'utf8');
    urlList = JSON.parse(urlList);

    for (let i = 0; i < urlList.length; i++) {
        if(!urlList[i].streamUrl && !urlList[i].backupStreamUrl) continue;

        if(urlList[i].streamUrl) streamStatus = await getStreamStatus(urlList[i].streamUrl);
        if(urlList[i].backupStreamUrl) backupStreamStatus = await getStreamStatus(urlList[i].backupStreamUrl);

        status.push(
            {
                name: urlList[i].name,
                mainStream: {
                    url: urlList[i].streamUrl,
                    status: streamStatus.status,
                    resolution: streamStatus.resolution,
                    response: streamStatus.response
                },
                backupStream: {
                    url: urlList[i].backupStreamUrl,
                    status: backupStreamStatus.status,
                    resolution: backupStreamStatus.resolution,
                    response: backupStreamStatus.response
                }
            }
        )
    }
    await fs.writeFileSync('streamwithstatus.json', JSON.stringify(status));
    
    await fs.writeFileSync('stream.m3u', '#EXTM3U\n');
    for(let i = 0; i < status.length; i++) {
        if(status[i].mainStream.status === 200) {
            await fs.appendFileSync('stream.m3u', m3uGenerator(status[i].name, status[i].mainStream.url, status[i].mainStream.resolution));
        }
        if(status[i].backupStream.status === 200) {
            await fs.appendFileSync('stream.m3u', m3uGenerator(`${status[i].name} - Yedek`, status[i].backupStream.url, status[i].backupStream.resolution));
        }
    }
    console.log('Stream list with status created.');
})();