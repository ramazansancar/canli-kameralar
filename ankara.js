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
    if(!resolution) return `#EXTINF:-1 tvg-id="${nameGenerator(name)}" tvg-logo="" group-title="${name}",${name}\n${url}\n`;
    return `#EXTINF:-1 tvg-id="${nameGenerator(name)}" tvg-logo="" group-title="${name}", ${name} (${resolution.height}p)\n${url}\n`;
};

await axios.get('https://www.izlesene.com/kanal/ankara-buyuksehir-belediyesi/1')
fs.readFile('./list-ankara.json', 'utf8', async (err, data) => {
    if (err) throw err;

    let status = [];
    let urlList = JSON.parse(data);

    await fs.writeFileSync('stream.m3u', '#EXTM3U\n');
    for (let i = 0; i < urlList.length; i++) {
        await fs.appendFileSync('stream.m3u', m3uGenerator(urlList[i].name, urlList[i].streamUrl));
    }

    fs.writeFileSync('ankara-status.json', JSON.stringify(status));
});