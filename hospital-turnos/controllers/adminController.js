const Profesional = require('../models/profesionalModel');
const Usuario = require('../models/usuarioModel');
// const { sequelize } = require('../config/database'); // Opcional por si usás transacciones

// 1. MOSTRAR FORMULARIO DE ALTA (GET)
const getAgregarMedico = async (req, res) => {
    try {
        // Control de acceso: Verificar que sea admin (Rol 1)
        if (!req.session || req.session.id_rol !== 1) {
            return res.redirect('/auth/login');
        }
        res.render('agregarMedico', { error: undefined, success: undefined });
    } catch (error) {
        console.error('Error al cargar formulario de médicos:', error);
        res.redirect('/dashboard/admin');
    }
};

// 2. PROCESAR EL ALTA EN CASCADA (POST)
const postAgregarMedico = async (req, res) => {
    try {
        if (!req.session || req.session.id_rol !== 1) {
            return res.redirect('/auth/login');
        }

        //  Recibimos id_especialidad del formulario
        const { nombre, apellido, id_especialidad, matricula, username, password } = req.body;

        const usuarioExiste = await Usuario.findOne({ where: { nombre_usuario: username } });
        if (usuarioExiste) {
            return res.render('agregarMedico', { 
                error: 'El nombre de usuario ya está en uso por otro miembro del sistema.',
                success: undefined 
            });
        }

        // Paso A: Crear el Profesional con su FK relacional
        const nuevoProfesional = await Profesional.create({
            nombre,
            apellido,
            id_especialidad, 
            matricula
        });

        // Paso B: Crear su Cuenta de Usuario
        await Usuario.create({
            nombre_usuario: username,
            contrasenia: password, 
            id_rol: 2, 
            id_profesional: nuevoProfesional.id_profesional, 
            estado: 'Active'
        });

        res.render('agregarMedico', { 
            error: undefined, 
            success: `¡El Dr. ${apellido} fue registrado con éxito!` 
        });

    } catch (error) {
        console.error(' Error crítico al dar de alta al médico:', error);
        res.render('agregarMedico', { 
            error: 'Ocurrió un error interno en la base de datos al guardar el profesional.', 
            success: undefined 
        });
    }
};

// Asegurate de exportar ambas funciones al final del archivo
module.exports = {
    // ... tus otras funciones (dashboard, turnos, etc.) ...
    getAgregarMedico,
    postAgregarMedico
};