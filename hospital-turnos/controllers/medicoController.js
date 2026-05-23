const Turno = require('../models/turnoModel');
const Profesional = require('../models/profesionalModel');
const Paciente = require('../models/pacienteModel');
const Atencion = require('../models/atencionModel');

// 1. Vista del Dashboard (Conectada a la sesión del médico)
const getDashboard = async (req, res) => {
    try {
        console.log('--- INTENTO DE ACCESO AL DASHBOARD MÉDICO ---');
        console.log('ID Rol en sesión:', req.session ? req.session.id_rol : 'No hay sesión');
        console.log('ID Profesional en sesión:', req.session ? req.session.id_profesional : 'No hay sesión');

        // 🚨 CONTROL DE ACCESO: Si no hay sesión o no es médico, directo a tu ruta oficial
        if (!req.session || !req.session.id_profesional) {
        console.log('⚠️ Acceso denegado: id_profesional ausente. Rebotando a /auth/login...');
        return res.redirect('/auth/login'); 
        }

        const idMedicoLogueado = req.session.id_profesional; 

        // Consultamos los turnos del profesional logueado
        const turnosDelMedico = await Turno.findAll({
            where: { id_profesional: idMedicoLogueado },
            include: [{ model: Paciente, as: 'paciente' }], 
            order: [['fecha', 'ASC'], ['hora', 'ASC']] 
        });

        // 🌟 CORREGIDO: Apunta directo a views/dashboardMedico.ejs sin barras raras
        res.render('dashboardMedico', {
            turnosPendientes: turnosDelMedico.length,
            turnos: turnosDelMedico, 
            error: undefined
        });

    } catch (error) {
        console.error('❌ Error al cargar la agenda del médico:', error);
        // 🌟 CORREGIDO AQUÍ TAMBIÉN:
        res.render('dashboardMedico', {
            turnosPendientes: 0,
            turnos: [],
            error: 'No se pudo sincronizar su agenda en tiempo real.'
        });
    }
};

// 2. MOSTRAR EL FORMULARIO DE ATENCIÓN (GET)
const getAtenderTurno = async (req, res) => {
    try {
        if (!req.session || !req.session.id_profesional) {
            return res.redirect('/auth/login');
        }

        const { id } = req.params; // Capturamos el id_turno desde la URL

        // Buscamos el turno e incluimos los datos del paciente para mostrarlos en la pantalla
        const turno = await Turno.findOne({
            where: { id_turno: id, id_profesional: req.session.id_profesional },
            include: [{ model: Paciente, as: 'paciente' }]
        });

        if (!turno) {
            return res.redirect('/medico/dashboard'); // Si el turno no existe o no es de este médico, rebota
        }

        res.render('atenderPaciente', { turno });

    } catch (error) {
        console.error('❌ Error al cargar formulario de atención:', error);
        res.redirect('/medico/dashboard');
    }
};

// 3. GUARDAR EL REGISTRO DE ATENCIÓN Y FINALIZAR TURNO (POST)
const postAtenderTurno = async (req, res) => {
    try {
        console.log('--- ENTRANDO AL POST DE ATENCIÓN MÉDICA ---');
        console.log('Datos del formulario recibidos (req.body):', req.body);
        console.log('Sesión actual en el POST:', req.session);
        console.log('ID Profesional en el POST:', req.session ? req.session.id_profesional : 'No existe');
        if (!req.session || !req.session.id_profesional) {
            console.log('⚠️ Rebotado del POST: No se encontró id_profesional en la sesión.');
            return res.redirect('/auth/login');
        }

        const { id_turno, diagnostico, tratamiento, observaciones } = req.body;

        // 1. Creamos el registro de atención en la base de datos
        await Atencion.create({
            id_turno,
            diagnostico,
            tratamiento,
            observaciones
        });

        // 2. Actualizamos el estado del turno a 'Atendido'
        await Turno.update(
            { estado: 'Atendido' }, 
            { where: { id_turno: id_turno } }
        );

        res.redirect('/medico/dashboard');

    } catch (error) {
        console.error('❌ Error al guardar la atención médica:', error);
        res.status(500).send('Error interno del servidor al registrar la atención.');
    }
};

// 2. Procesar Disponibilidad 
const postGuardarDisponibilidad = async (req, res) => {
    try {
        console.log('Datos de disponibilidad recibidos:', req.body);
        res.redirect('/medico/dashboard'); // Acá SÍ va la barra porque es una URL de redirección
    } catch (error) {
        console.error('Error al guardar disponibilidad:', error);
        res.status(500).send('Error interno del servidor');
    }
};

// 4. VER HISTORIAL MÉDICO DEL PACIENTE (GET)
const getHistorialPaciente = async (req, res) => {
    try {
        if (!req.session || !req.session.id_profesional) {
            return res.redirect('/auth/login');
        }

        const idPaciente = req.params.id_paciente;

        // 1. Buscamos los datos básicos del paciente
        const paciente = await Paciente.findByPk(idPaciente);

        if (!paciente) {
            console.log('⚠️ Paciente no encontrado para el historial');
            return res.redirect('/medico/dashboard');
        }

        // 2. Buscamos todas las atenciones previas de este paciente
        // Para esto, filtramos en Atencion uniendo (include) con la tabla Turno, 
        // donde el id_paciente coincida con el solicitado.
        const historial = await Atencion.findAll({
            include: [{
                model: Turno,
                as: 'turno',
                where: { id_paciente: idPaciente },
                include: [{
                    model: Profesional,
                    as: 'profesional' // Incluimos el médico que lo atendió para mostrar su nombre
                }]
            }],
            order: [[{ model: Turno, as: 'turno' }, 'fecha', 'DESC']] // Primero lo más reciente
        });

        // Renderizamos la nueva vista de historial
        res.render('historialPaciente', {
            paciente,
            historial
        });

    } catch (error) {
        console.error('❌ Error al obtener el historial médico:', error);
        res.redirect('/medico/dashboard');
    }
};

module.exports = {
    getDashboard,
    postGuardarDisponibilidad,
    getAtenderTurno,
    postAtenderTurno,
    getHistorialPaciente
};