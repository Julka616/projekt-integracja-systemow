const { DataTypes } = require('sequelize');

module.exports = (sequelize) =>
    sequelize.define('GPUPrice', {
        date: DataTypes.DATEONLY,
        retailPrice: DataTypes.FLOAT,
        usedPrice: DataTypes.FLOAT,
    });
