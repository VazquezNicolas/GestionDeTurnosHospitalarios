// models/profesionalModel.js
const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');
const Especialidad = require('./especialidadModel');

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
    },
    id_especialidad: {
        type: DataTypes.INTEGER,
        allowNull: false,
        field: 'id_especialidad' 
    }
}, {
    tableName: 'profesional',
    timestamps: false // Para que no busque las columnas createdAt/updatedAt
});


module.exports = Profesional;