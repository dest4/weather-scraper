const axios = require('axios');

const VERBOSE = process.argv.includes('--verbose');

const accentsMap = new Map([
    ["A", "Á|À|Ã|Â|Ä"],
    ["a", "á|à|ã|â|ä"],
    ["E", "É|È|Ê|Ë"],
    ["e", "é|è|ê|ë"],
    ["I", "Í|Ì|Î|Ï"],
    ["i", "í|ì|î|ï"],
    ["O", "Ó|Ò|Ô|Õ|Ö"],
    ["o", "ó|ò|ô|õ|ö"],
    ["U", "Ú|Ù|Û|Ü"],
    ["u", "ú|ù|û|ü"],
    ["C", "Ç"],
    ["c", "ç"],
    ["N", "Ñ"],
    ["n", "ñ"]
  ]);
  
const removeAccents = (text) => 
    [...accentsMap].reduce((acc, [key]) => acc.replace(new RegExp(accentsMap.get(key), "g"), key), text);

(async function () {
    try {
        // get cookie
        const response = await axios.head('https://meteofrance.com/previsions-meteo-france/paris-12e-arrondissement/75012');
        const cookie = response.headers['set-cookie'][0];

        // build token from cookie
        const cookieContents = cookie.match(new RegExp('(^| )mfsession=([^;]+)'));
        if (!cookieContents) {
            throw new Error('cookie not recognized');
        }
        const cookieField = decodeURIComponent(cookieContents[2]);
        const derivedToken = cookieField.replace(/[a-zA-Z]/g, function (e) {
            var t = e <= 'Z' ? 65 : 97;
            return String.fromCharCode(t + (e.charCodeAt(0) - t + 13) % 26)
        });

        const headers = {
            'credentials': 'include',
            'headers': {
                'User-Agent': 'Mozilla/5.0 (X11; Linux x86_64; rv:95.0) Gecko/20100101 Firefox/95.0',
                'Accept': '*/*',
                'Accept-Language': 'fr,en;q=0.5',
                'Authorization': `Bearer ${derivedToken}`,
                'Sec-Fetch-Dest': 'empty',
                'Sec-Fetch-Mode': 'cors',
                'Sec-Fetch-Site': 'same-site',
                'Pragma': 'no-cache',
                'Cache-Control': 'no-cache'
            },
            'referrer': 'https://meteofrance.com/',
            'method': 'GET',
            'mode': 'cors'
        };

        // get actual forecast data
        const forecast = await axios.get('https://rpcache-aa.meteofrance.com/internet2018client/2.0/forecast?lat=48.841348&lon=2.386885&id=&instants=&day=2', headers);
        const daily = forecast.data.properties['daily_forecast'][new Date().getHours() >= 18 ? 1 : 0];
        if (VERBOSE) {
            console.log('FORECAST');
            console.log(forecast.data);
            console.log(forecast.data.properties['daily_forecast']);
            console.log(forecast.data.properties['forecast']);
        }

        // get raining forecast
        const raining = await axios.get('https://rpcache-aa.meteofrance.com/internet2018client/2.0/nowcast/rain?lat=48.841348&lon=2.386885', headers);
        const rainIntensity = Math.max(...raining.data.properties.forecast.map(fc => fc['rain_intensity']));
        let rainLabel = '  ';
        if (rainIntensity >= 4) {
            rainLabel = 'RA';
        } else if (rainIntensity >= 2) {
            rainLabel = 'ra'
        }

        if (VERBOSE) {
            console.log('RAINING');
            console.log(raining.data);
            console.log(raining.data.properties.forecast);
        }
        // const rainForecast = raining.data.properties.forecast.map(fc => fc['rain_intensity']).join('');
        // console.log(rainForecast);

        const l1 = `${daily.time.slice(8, 10)}-${daily.time.slice(5, 7)} ${Math.round(daily['T_min'])}->${Math.round(daily['T_max'])}C ${rainLabel}          `.slice(0, 16);
        const l2 = `${removeAccents(daily['daily_weather_description'])}                `.slice(0, 16);

        const ephemeris = await axios.get('https://rpcache-aa.meteofrance.com/internet2018client/2.0/ephemeris?lat=48.841348&lon=2.386885', headers)
        const ephData = ephemeris.data.properties.ephemeris;
        // const sunrise = daily['sunrise_time'].slice(11, 16);
        // const sunset = daily['sunset_time'].slice(11, 16);
        
        if (VERBOSE) {
            console.log('EPHEMERIS');
            console.log(ephemeris.data);
        }

        const metar = await axios.get('https://api.checkwx.com/metar/LFPO', { 'headers': {'X-API-Key': 'a61f8e9f3c9a4f8083910ef199'}});
        const qnh = metar.data.data[0].split(' ').find(block => block[0] === 'Q').slice(1);
        const wind = metar.data.data[0].split(' ').find(block => block.slice(-2) === 'KT');

        if (VERBOSE) {
            console.log('METAR');
            console.log(metar.data);
        }

        const l3 = `${qnh} ${wind}                `.slice(0, 16);
        
        const saintSplit = ephData.saint.split(' ');
        const saintPrefix = saintSplit[0] === 'Saint' ? 'St' : 'Ste';
        const saintName = saintSplit.slice(1).join(' ');
        const l4 = `${saintPrefix} ${removeAccents(saintName)}                  `.slice(0, 16);

        const result = `${l1}${l3}\n${l2}${l4}`;
        console.log(result);
    } catch (e) {
        console.error(`fetching failed with error: ${e}`);
    }
})();
