const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');
const Paciente = require('./pacienteModel');
const Profesional = require('./profesionalModel');

const Turno = sequelize.define('Turno', {
    id_turno: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
    },
    id_paciente: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: { model: 'paciente', key: 'id_paciente' }
    },
    id_profesional: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: { model: 'profesional', key: 'id_profesional' }
    },
    id_consultorio: {
        type: DataTypes.INTEGER,
        allowNull: false // Matchea el NOT NULL de tu script de SQL
    },
    fecha: {
        type: DataTypes.DATEONLY,
        allowNull: false
    },
    hora: {
        type: DataTypes.TIME,
        allowNull: false
    },
    estado: {
        type: DataTypes.STRING(50),
        defaultValue: 'Reservado' // Matchea el DEFAULT 'Reservado' de tu SQL
    },
    motivo_consulta: {
        type: DataTypes.TEXT, // Matchea con MOTIVO_CONSULTA TEXT de tu SQL
        allow_null: true
    }
}, {
    tableName: 'turno', 
    timestamps: false
});

// Relaciones para los JOINs
Turno.belongsTo(Paciente, { foreignKey: 'id_paciente', as: 'paciente' });
Turno.belongsTo(Profesional, { foreignKey: 'id_profesional', as: 'profesional' });

module.exports = Turno;