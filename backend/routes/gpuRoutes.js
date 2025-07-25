const express = require('express');
const router = express.Router();
const { GPUModel, GPUPrice } = require('../models');

router.get('/', async (req, res) => {
    const gpus = await GPUModel.findAll({ include: GPUPrice });
    res.json(gpus);
});

module.exports = router;
