const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');
const Rol = require('./rolModel');

const Usuario = sequelize.define('Usuario', {
    id_usuario: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
    },
    id_rol: {
        type: DataTypes.INTEGER,
        allowNull: false
    },
    id_profesional: {
        type: DataTypes.INTEGER,
        allowNull: true, // NULL porque el Admin no tiene id_profesional
        field: 'id_profesional' // Fuerza a Sequelize a leer la columna exacta de la BD
    },
    nombre_usuario: { // Asegurate de que acá diga nombre_usuario
        type: DataTypes.STRING(50),
        allowNull: false,
        unique: true
    },
    contrasenia: { // Atributo en minúscula sin la ñ para evitar bugs de caracteres
        type: DataTypes.STRING(255),
        allowNull: false
    },
    estado: {
        type: DataTypes.STRING(20),
        defaultValue: 'Active'
    }
}, {
    tableName: 'usuario',
    timestamps: false
});


module.exports = Usuario;