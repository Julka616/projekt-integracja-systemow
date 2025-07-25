const googleTrends = require('google-trends-api');
const { BitcoinTrend, sequelize } = require('../models');
const { writeFileSync } = require('fs');
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });

/**
 * A utility function to introduce a delay.
 * @param {number} ms
 */
function delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}


async function importBitcoinTrends() {
    await sequelize.sync();

    const startYear = 2022;
    const endYear = 2024;

    try {
        for (let year = startYear; year <= endYear; year++) {
            const startDate = new Date(`${year}-01-01T00:00:00Z`);
            const endDate = new Date(`${year}-12-31T23:59:59Z`);

            console.log(`\n--- Fetching Bitcoin trends for year: ${year} ---`);
            console.log(`Requesting data from: ${startDate.toISOString()} to: ${endDate.toISOString()}`);
            console.log(`Keyword: 'bitcoin', Geo: '', Granular Resolution: true`);

            let results;
            try {
                results = await googleTrends.interestOverTime({
                    keyword: 'bitcoin',
                    startTime: startDate,
                    endTime: endDate,
                    geo: '',
                    granularTimeResolution: true,
                });
                console.log(`Raw API response length for ${year}: ${results ? results.length : 'N/A'}`);
            } catch (apiErr) {
                console.error(`Error fetching data from Google Trends API for year ${year}:`, apiErr);
                console.error(`This error often indicates a malformed request, which might be due to limitations or changes in Google's internal Trends API that the 'google-trends-api' package might not fully handle.`);
                console.error(`Attempting to continue to the next year (if any)...`);
                continue;
            }


            let parsed;
            try {
                parsed = JSON.parse(results);
            } catch (parseErr) {
                console.error(`Error parsing JSON response for year ${year}:`, parseErr);
                console.error(`Raw response that caused parsing error:\n${results}`);
                continue;
            }


            writeFileSync('trends.json', JSON.stringify(parsed, null, 2));

            if (parsed.default && parsed.default.timelineData && parsed.default.timelineData.length > 0) {
                let processedEntries = 0;
                for (const item of parsed.default.timelineData) {
                    const dateStrRaw = item.formattedTime;
                    const popularity = item.value[0];

                    let dateToParse;
                    const enDash = '\u2013';

                    if (dateStrRaw.includes(enDash)) {
                        const parts = dateStrRaw.split(enDash);
                        const firstPart = parts[0].trim();
                        const yearMatch = dateStrRaw.match(/(\d{4})$/);
                        const yearFromRange = yearMatch ? yearMatch[1] : '';

                        if (yearFromRange) {
                            dateToParse = `${firstPart}, ${yearFromRange}`;
                        } else {
                            dateToParse = firstPart;
                            console.warn(`Could not reliably extract year from range string: '${dateStrRaw}'. Attempting to parse only '${firstPart}'.`);
                        }
                    } else {
                        dateToParse = dateStrRaw;
                    }

                    const date = new Date(dateToParse);
                    if (isNaN(date.getTime())) {
                        console.warn(`Skipped invalid date string for ${year}: '${dateStrRaw}' (attempted to parse as '${dateToParse}'). Popularity: ${popularity}`);
                        continue;
                    }

                    const dateISO = date.toISOString().split('T')[0];

                    await BitcoinTrend.upsert({
                        date: dateISO,
                        popularity,
                    });
                    processedEntries++;
                }
                console.log(`Bitcoin trends imported successfully for ${year}. Processed ${processedEntries} entries.`);
            } else {
                console.warn(`No timeline data found for year: ${year}. Response: ${JSON.stringify(parsed)}`);
            }

            if (year < endYear) {
                await delay(2000);
            }
        }

        console.log('\nAll Bitcoin trends import process completed for 2022-2024 (some years might have been skipped due to errors)!');
    } catch (err) {
        console.error('An unhandled error occurred during bitcoin trends import:', err);
    }
}

importBitcoinTrends();
