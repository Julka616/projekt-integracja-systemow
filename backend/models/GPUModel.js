const { DataTypes } = require('sequelize');

module.exports = (sequelize) =>
    sequelize.define('GPUModel', {
        name: {
            type: DataTypes.STRING,
            allowNull: false,
            unique: true,
        },
    });
