const Turno = require('../models/turnoModel');
const Profesional = require('../models/profesionalModel');
const Paciente = require('../models/pacienteModel');

// 1. Vista del Dashboard (Tus líneas originales intactas)
const getDashboard = async (req, res) => {
    try {
        // Simulamos capturar el usuario logueado. Supongamos que se logueó con usuario: 'Bilardo'
        const medicoLogueado = 'Bilardo'; 

        // Buscamos el perfil profesional que coincida con ese apellido
        const profesional = await Profesional.findOne({ 
            where: { apellido: medicoLogueado } 
        });

        let turnosDelMedico = [];
        let totalPendientes = 0;

        if (profesional) {
            // Traemos todos los turnos de ese profesional e incluimos los datos del paciente (JOIN)
            turnosDelMedico = await Turno.findAll({
                where: { id_profesional: profesional.id_profesional },
                include: [{ model: Paciente, as: 'paciente' }],
                order: [['hora', 'ASC']]
            });
            totalPendientes = turnosDelMedico.length;
        }

        // Renderizamos pasándole la jugada real a la vista
        res.render('dashboardMedico', {
            turnosPendientes: totalPendientes,
            turnos: turnosDelMedico, 
            error: undefined
        });

    } catch (error) {
        console.error('❌ Error al cargar la agenda del médico:', error);
        res.render('dashboardMedico', {
            turnosPendientes: 0,
            turnos: [],
            error: 'No se pudo sincronizar su agenda en tiempo real.'
        });
    }
};

// 2. Procesar Disponibilidad (La función que faltaba para que no explote app.js)
const postGuardarDisponibilidad = async (req, res) => {
    try {
        console.log('📅 Datos de disponibilidad recibidos:', req.body);
        
        // Dejamos la redirección lista para cuando desarrollen esta lógica a futuro
        res.redirect('/medico/dashboard');
    } catch (error) {
        console.error('❌ Error al guardar disponibilidad:', error);
        res.status(500).send('Error interno del servidor');
    }
};

// 📦 EXPORTACIÓN CONTROLADA (Crucial para Express)
module.exports = {
    getDashboard,
    postGuardarDisponibilidad
};