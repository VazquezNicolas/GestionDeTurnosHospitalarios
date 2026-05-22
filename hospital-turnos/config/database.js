const { Sequelize } = require('sequelize');

// Parámetros: 'nombre_bd', 'usuario', 'contraseña'
// IMPORTANTE: Si usás XAMPP, el usuario suele ser 'root' y la contraseña va vacía ''
// Si usás MySQL Installer, poné la contraseña que le asignaste al root.
const sequelize = new Sequelize('hospital_turnos_db', 'root', 'root', {
    host: 'localhost',
    dialect: 'mysql',
    logging: false, // Para que no llene la consola de líneas de código SQL raras
    define: {
        timestamps: false // Evita que Sequelize busque las columnas automáticas createdAt y updatedAt
    }
});

// Función para probar que el puente responda
const conectarDB = async () => {
    try {
        await sequelize.authenticate();
        console.log('Conexión exitosa a la Base de Datos MySQL (Sequelize).');
    } catch (error) {
        console.error('Error crítico al conectar a la base de datos:', error);
    }
};

// Exportamos tanto la conexión (sequelize) como la función de testeo (conectarDB)
module.exports = { sequelize, conectarDB };