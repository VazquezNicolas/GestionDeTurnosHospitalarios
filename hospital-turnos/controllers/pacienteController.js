// Importamos el modelo real de Paciente
const Paciente = require('../models/pacienteModel');

// 1. Vista: Mostrar el formulario de registro (Queda igual)
exports.getRegistroPaciente = (req, res) => {
    res.render('registrarPaciente', { error: undefined, exito: undefined }); // 👈 Cambiado a 'registrarPaciente'
};

// 2. Acción: Procesar el formulario (POST) - Ahora es ASÍNCRONA
exports.postRegistroPaciente = async (req, res) => {
    const { dni, nombre, apellido, fecha_nacimiento, sexo, telefono, email, direccion, historia_clinica } = req.body;

    try {
        const pacienteExistente = await Paciente.findOne({ where: { dni } });
        
        if (pacienteExistente) {
            return res.render('registrarPaciente', { 
                error: `Ya existe un paciente registrado con el DNI ${dni}.`, 
                exito: undefined 
            });
        }

        // BIEN DE BASE DE DATOS: Si no existe, lo insertamos físicamente en MySQL
        await Paciente.create({
            dni,
            nombre,
            apellido,
            fecha_nacimiento, // Sequelize se encarga de formatearlo a DATE (AAAA-MM-DD)
            sexo,
            telefono,
            email,
            direccion,
            historia_clinica
        });

        // Si todo sale bien, recargamos la vista avisando el éxito
        return res.render('registrarPaciente', { 
            error: undefined, 
            exito: 'Paciente registrado en el sistema hospitalario con éxito.' 
        });

    } catch (error) {
        console.error ('Error al registrar paciente en MySQL:', error);
        return res.render('registrarPaciente', { 
            error: 'Ocurrió un error interno al intentar guardar el paciente.', 
            exito: undefined 
        });
    }
};