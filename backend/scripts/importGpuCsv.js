const fs = require('fs');
const path = require('path');
const csv = require('csv-parser');
const { GPUModel, GPUPrice, sequelize } = require('../models');

const filePath = path.join(__dirname, 'gpu_prices.csv');

async function importCSV() {
    await sequelize.sync({ alter: true });

    const results = [];

    fs.createReadStream(filePath)
        .pipe(csv({ separator: ',' }))
        .on('data', (data) => results.push(data))
        .on('end', async () => {
            console.log('Przykładowy wiersz:', results[0]);

            for (const row of results) {
                const { Date: dateStr, Name, 'Retail Price': retail, 'Used Price': used } = row;

                if (!Name || !dateStr) {
                    console.warn('Brak wymaganych danych w wierszu:', row);
                    continue;
                }

                const [day, month, year] = dateStr.split('-');
                if (!day || !month || !year) {
                    console.warn('Błędny format daty:', dateStr);
                    continue;
                }

                const fullYear = parseInt(year) < 50 ? '20' + year : '19' + year;
                const isoDate = `${fullYear}-${month}-${day}`;
                const parsedDate = new Date(isoDate);

                if (isNaN(parsedDate)) {
                    console.warn('Nieprawidłowa data:', dateStr, '->', isoDate);
                    continue;
                }

                const [gpuModel] = await GPUModel.findOrCreate({
                    where: { name: Name },
                });

                await GPUPrice.create({
                    date: parsedDate,
                    retailPrice: parseFloat(retail) || 0,
                    usedPrice: parseFloat(used) || 0,
                    modelId: gpuModel.id,
                });
            }


            console.log('Import completed');
            process.exit(0);
        });
}

importCSV().catch((err) => {
    console.error('Import failed:', err);
    process.exit(1);
});
