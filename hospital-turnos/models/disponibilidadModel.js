const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');
const Profesional = require('./profesionalModel');

const Disponibilidad = sequelize.define('Disponibilidad', {
    id_disponibilidad: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
    },
    id_profesional: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: { model: 'profesional', key: 'id_profesional' }
    },
    fecha: {
        type: DataTypes.DATEONLY,
        allowNull: false
    },
    hora: {
        type: DataTypes.TIME,
        allowNull: false
    }
}, {
    tableName: 'disponibilidad',
    timestamps: false
});

// Relación lógica relacional
Disponibilidad.belongsTo(Profesional, { foreignKey: 'id_profesional', as: 'profesional' });

module.exports = Disponibilidad;