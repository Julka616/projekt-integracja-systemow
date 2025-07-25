const { Sequelize } = require('sequelize');
const config = require('../config').development;

const sequelize = new Sequelize(config.database, config.username, config.password, {
    host: config.host,
    dialect: config.dialect,
});

const GPUModel = require('./GPUModel')(sequelize);
const GPUPrice = require('./GPUPrice')(sequelize);
const BitcoinTrend = require('./BitcoinTrend')(sequelize);
const User = require('./User')(sequelize);


// Relacje
GPUModel.hasMany(GPUPrice, { foreignKey: 'modelId' });
GPUPrice.belongsTo(GPUModel, { foreignKey: 'modelId' });

module.exports = {
    sequelize,
    Sequelize,
    GPUModel,
    GPUPrice,
    BitcoinTrend,
    User
};
