const express = require('express');
const soap = require('soap');
const router = express.Router();

const WSDL_URL = 'http://localhost:8001/soap?wsdl';

router.get('/avg-price', async (req, res) => {
    const modelName = req.query.model;
    const token = req.headers['authorization'];

    if (!token) {
        return res.status(401).json({ error: 'Brak tokena w nagłówku' });
    }

    try {
        const client = await soap.createClientAsync(WSDL_URL, {
            wsdl_headers: { Authorization: token }
        });

        client.addHttpHeader('Authorization', token);

        const [result] = await client.getAveragePriceAsync({ modelName });

        res.json({ averagePrice: result.averagePrice });
    } catch (err) {
        console.error('🔥 SOAP ERROR:', err);
        res.status(500).json({ error: err.message || 'SOAP error' });
    }
});

module.exports = router;
