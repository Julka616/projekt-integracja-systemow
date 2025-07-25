const { DataTypes } = require('sequelize');

module.exports = (sequelize) =>
    sequelize.define('BitcoinTrend', {
        date: DataTypes.DATEONLY,
        popularity: DataTypes.INTEGER,
    });
