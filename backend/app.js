const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const requireAuth = require('./routes/authMiddleware');
require('dotenv').config();
const jwt = require('jsonwebtoken');
const yaml = require('js-yaml');
const js2xmlparser = require('js2xmlparser');
const { User } = require('./models');


const SECRET = process.env.JWT_SECRET || 'supersecret';

const { GPUModel, GPUPrice, BitcoinTrend, sequelize } = require('./models');
const bcrypt = require("bcryptjs");

const app = express();

app.use(cors());
app.use(bodyParser.json());

app.get('/api/gpu-models', requireAuth ,  async (req, res) => {
    try {
        const gpuModels = await GPUModel.findAll({
            include: [{ model: GPUPrice, limit: 1, order: [['date', 'DESC']] }],
        });
        res.json(gpuModels);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.get('/api/bitcoin-trends', requireAuth, async (req, res) => {
    try {
        const trends = await BitcoinTrend.findAll({
            order: [['date', 'ASC']],
        });
        res.json(trends);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.get('/api/gpu-models/:id/prices', requireAuth, async (req, res) => {
    try {
        const prices = await GPUPrice.findAll({
            where: { modelId: req.params.id },
            order: [['date', 'ASC']],
            include: [GPUModel]
        });
        res.json(prices);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.use('/api/soap', require('./routes/soapProxy'));


app.post('/api/transaction/default', requireAuth, async (req, res) => {
    const { name, retailPrice, date } = req.body;

    const t = await sequelize.transaction();
    try {
        let model = await GPUModel.findOne({ where: { name }, transaction: t });

        if (!model) {
            model = await GPUModel.create({ name }, { transaction: t });
        }

        await GPUPrice.create({
            modelId: model.id,
            retailPrice,
            date
        }, { transaction: t });

        await t.commit();
        res.json({ message: 'GPU price added with default isolation level' });
    } catch (err) {
        await t.rollback();
        res.status(500).json({ error: err.message });
    }
});

app.post('/api/transaction/serializable', requireAuth, async (req, res) => {
    const { name, retailPrice, date } = req.body;

    const t = await sequelize.transaction({ isolationLevel: 'SERIALIZABLE' });

    try {
        let model = await GPUModel.findOne({ where: { name }, transaction: t });

        if (!model) {
            model = await GPUModel.create({ name }, { transaction: t });
        }

        await GPUPrice.create({
            modelId: model.id,
            retailPrice,
            date
        }, { transaction: t });

        await t.commit();
        res.json({ message: 'GPU price added with SERIALIZABLE isolation level' });
    } catch (err) {
        await t.rollback();
        res.status(500).json({ error: err.message });
    }
});

// Rejestracja
app.post('/api/auth/register', async (req, res) => {
    try {
        const { username, password } = req.body;
        const existing = await User.findOne({ where: { username } });

        if (existing) {
            return res.status(400).json({ error: 'User already exists' });
        }

        const passwordHash = await bcrypt.hash(password, 10);

        const user = await User.create({
            username,
            passwordHash
        });

        res.json({ message: 'User created' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});


// Logowanie
app.post('/api/auth/login', async (req, res) => {
    try {
        const { username, password } = req.body;
        const user = await User.findOne({ where: { username } });

        if (!user || !(await user.validatePassword(password))) {
            return res.status(401).json({ error: 'Invalid credentials' });
        }

        const token = jwt.sign({ id: user.id, username: user.username }, SECRET, {
            expiresIn: '1h'
        });

        res.json({ token });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});


app.get('/api/export/bitcoin-popularity', requireAuth, async (req, res) => {
    try {
        const format = (req.query.format || 'json').toLowerCase();
        const data = await BitcoinTrend.findAll({ order: [['date', 'ASC']] });

        const plainData = data.map(d => d.toJSON());

        let fileContents;
        let contentType;
        let fileExtension;

        switch (format) {
            case 'xml':
                fileContents = js2xmlparser.parse("bitcoinTrends", plainData);
                contentType = 'application/xml';
                fileExtension = 'xml';
                break;

            case 'yaml':
            case 'yml':
                fileContents = yaml.dump(plainData);
                contentType = 'application/x-yaml';
                fileExtension = 'yaml';
                break;

            case 'json':
            default:
                fileContents = JSON.stringify(plainData, null, 2);
                contentType = 'application/json';
                fileExtension = 'json';
                break;
        }

        res.setHeader('Content-Disposition', `attachment; filename=bitcoin_popularity.${fileExtension}`);
        res.setHeader('Content-Type', contentType);
        res.send(fileContents);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Failed to export bitcoin popularity data' });
    }
});





const PORT = process.env.PORT || 5000;

sequelize.sync({ alter: true }).then(() => {
    app.listen(PORT, () => {
        console.log(`Server running on port ${PORT}`);
    });
});
