const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const Turno = require('./turnoModel'); // Para vincularlo con el turno

const Atencion = sequelize.define('Atencion', {
    id_atencion: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
        field: 'id_registro'
    },
    id_turno: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
            model: Turno,
            key: 'id_turno'
        }
    },
    diagnostico: {
        type: DataTypes.TEXT,
        allowNull: false
    },
    tratamiento: {
        type: DataTypes.TEXT,
        allowNull: true
    },
    observaciones: {
        type: DataTypes.TEXT,
        allowNull: true
    },
    fecha_atencion: {
        type: DataTypes.DATEONLY,
        defaultValue: DataTypes.NOW
    }
}, {
    tableName: 'registro_atencion', // Asegurate de que coincida con tu nombre en MySQL
    timestamps: false
});

// Configurar las asociaciones relacionales

module.exports = Atencion;