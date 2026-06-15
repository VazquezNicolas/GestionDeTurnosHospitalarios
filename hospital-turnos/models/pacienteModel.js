const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');
const Turno = require('./turnoModel');

const Paciente = sequelize.define('Paciente', {
    id_paciente: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
    },
    dni: {
        type: DataTypes.STRING(20),
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
    fecha_nacimiento: {
        type: DataTypes.DATEONLY, // DATEONLY guarda solo AAAA-MM-DD sin la hora
        allowNull: false
    },
    sexo: {
        type: DataTypes.CHAR(1),
        allowNull: false
    },
    telefono: {
        type: DataTypes.STRING(20)
    },
    email: {
        type: DataTypes.STRING(100)
    },
    direccion: {
        type: DataTypes.STRING(255)
    },
    historia_clinica: {
        type: DataTypes.TEXT
    }
}, {
    tableName: 'paciente',
    timestamps: false
});


module.exports = Paciente;