const axios = require('axios');
const assert = require('assert');

const VERBOSE = process.argv.includes('--verbose');

const CHECKWX_KEY = 'a61f8e9f3c9a4f8083910ef199';
const LAT = 48.841348;
const LON = 2.386885;

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
        let derivedToken = '';
        try {
            const response = await axios.head('https://meteofrance.com/previsions-meteo-france/paris-12e-arrondissement/75012');
            const cookie = response.headers['set-cookie'][0];

            // build token from cookie
            const cookieContents = cookie.match(new RegExp('(^| )mfsession=([^;]+)'));
            if (!cookieContents) {
                throw new Error('cookie not recognized');
            }
            const cookieField = decodeURIComponent(cookieContents[2]);
            derivedToken = cookieField.replace(/[a-zA-Z]/g, function (e) {
                var t = e <= 'Z' ? 65 : 97;
                return String.fromCharCode(t + (e.charCodeAt(0) - t + 13) % 26)
            });
        } catch (e) {
            console.warn(`could not get token ${e}`);
        }

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
        let daily = { time: '', 'daily_weather_description': '??', 'T_min': '99', 'T_max': '99' };
        try {
            assert(derivedToken, 'no token');
            const forecast = await axios.get(`https://rpcache-aa.meteofrance.com/internet2018client/2.0/forecast?lat=${LAT}&lon=${LON}&id=&instants=&day=2`, headers);
            daily = forecast.data.properties['daily_forecast'][new Date().getHours() >= 18 ? 1 : 0];
            if (VERBOSE) {
                console.log('FORECAST');
                console.log(forecast.data);
                console.log(forecast.data.properties['daily_forecast']);
                console.log(forecast.data.properties['forecast']);
            }
        } catch (e) {
            console.warn(`cannot fetch daily forecast ${e}`);
        }

        // get raining forecast
        let rainLabel = '??';
        try {
            assert(derivedToken, 'no token');
            const raining = await axios.get(`https://rpcache-aa.meteofrance.com/internet2018client/2.0/nowcast/rain?lat=${LAT}&lon=${LON}`, headers);
            const rainIntensity = Math.max(...raining.data.properties.forecast.map(fc => fc['rain_intensity']));
            rainLabel = '  ';
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
        } catch (e) {
            console.warn(`cannot fetch raining forecast ${e}`);
        }

        // if it does not rain, grab the pollen atmospheric report
        if (rainLabel === '  ') {
            try {
                const pollenRaw = await axios.get('https://pollens.fr/risks/thea/counties/75');
                if (VERBOSE) {
                    console.log(pollenRaw.data);
                }
                const pollenReport = pollenRaw.data;
                const grObject = pollenReport.risks.find(r => r.pollenName === 'Graminées');
                if (grObject) {
                    rainLabel = `G${grObject.level}`;
                } else {
                    console.warn('pollen object not found');
                }
            } catch(e) {
                console.warn(`cannot fetch pollen report ${e}`);
            }
        } else {
            if (VERBOSE) {
                console.info(`rainLabel=${rainLabel}, skipping display of pollen report`);
            }
        }

        const l1 = `${daily.time.slice(8, 10)}-${daily.time.slice(5, 7)} ${Math.round(daily['T_min'])}->${Math.round(daily['T_max'])}C ${rainLabel}          `.slice(0, 16);
        const l2 = `${removeAccents(daily['daily_weather_description'])}                `.slice(0, 16);

        let saintPrefix = '?', saintName = '';
        try {
            assert(derivedToken, 'no token');
            const ephemeris = await axios.get(`https://rpcache-aa.meteofrance.com/internet2018client/2.0/ephemeris?lat=${LAT}&lon=${LON}`, headers)
            const ephData = ephemeris.data.properties.ephemeris;
            // const sunrise = daily['sunrise_time'].slice(11, 16);
            // const sunset = daily['sunset_time'].slice(11, 16);

            if (VERBOSE) {
                console.log('EPHEMERIS');
                console.log(ephemeris.data);
            }

            const saintSplit = ephData.saint.split(' ');
            saintPrefix = saintSplit[0] === 'Saint' ? 'St' : 'Ste';
            saintName = saintSplit.slice(1).join(' ');
        } catch (e) {
            console.warn(`could not get ephemeris ${e}`);
        }
        const l4 = `${saintPrefix} ${removeAccents(saintName)}                  `.slice(0, 16);

        let qnh = '?', wind = '';
        try {
            const metar = await axios.get('https://api.checkwx.com/metar/LFPO', { 'headers': {'X-API-Key': CHECKWX_KEY}});
            qnh = metar.data.data[0].split(' ').find(block => block[0] === 'Q').slice(1);
            wind = metar.data.data[0].split(' ').find(block => block.slice(-2) === 'KT');

            if (VERBOSE) {
                console.log('METAR');
                console.log(metar.data);
            }
        } catch (e) {
            console.warn(`could not fetch metar ${e}`);
        }
        const l3 = `${qnh} ${wind}                `.slice(0, 16);

        const result = `${l1}${l3}\n${l2}${l4}`;
        console.log(result);
    } catch (e) {
        console.error(`fetching failed with error: ${e}`);
    }
})();
