
const https = require('https');

function fetchCard(name) {
    const url = `https://api.scryfall.com/cards/named?exact=${encodeURIComponent(name)}`;
    https.get(url, { headers: { 'User-Agent': 'TestScript/1.0' } }, (res) => {
        let data = '';
        res.on('data', (chunk) => data += chunk);
        res.on('end', () => {
            const json = JSON.parse(data);
            if (json.all_parts) {
                console.log('All Parts found:');
                console.log(JSON.stringify(json.all_parts, null, 2));
            } else {
                console.log('No all_parts found.');
            }
        });
    }).on('error', (e) => {
        console.error(e);
    });
}

fetchCard('Dragon Fodder');
