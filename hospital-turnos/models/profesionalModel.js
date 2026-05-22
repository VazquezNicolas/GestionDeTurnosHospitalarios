// models/profesionalModel.js
const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const Profesional = sequelize.define('Profesional', {
    id_profesional: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
    },
    matricula: {
        type: DataTypes.STRING(50),
        allowNull: false,
        unique: true
    },
    nombre: {
        type: DataTypes.STRING(100),
        allowNull: false
    },
    apellido: {
        type: DataTypes.STRING(100),
        allowNull: false
    }
}, {
    tableName: 'profesional',
    timestamps: false // Para que no busque las columnas createdAt/updatedAt
});

module.exports = Profesional;