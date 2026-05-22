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
    nombre_usuario: { // Asegurate de que acá diga nombre_usuario
        type: DataTypes.STRING(50),
        allowNull: false,
        unique: true
    },
    contrasena: { // Atributo en minúscula sin la ñ para evitar bugs de caracteres
        type: DataTypes.STRING(255),
        allowNull: false
    },
    estado: {
        type: DataTypes.STRING(20),
        defaultValue: 'Activo'
    }
}, {
    tableName: 'usuario',
    timestamps: false
});

// Relación lógica: Un Usuario pertenece a un Rol
Usuario.belongsTo(Rol, { foreignKey: 'id_rol', as: 'rol' });

module.exports = Usuario;