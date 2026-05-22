const Paciente = require('../models/pacienteModel');
const Profesional = require('../models/profesionalModel');
const Turno = require('../models/turnoModel');

// 1. CARGAR EL FORMULARIO (GET)
const getAsignarTurno = async (req, res) => {
    try {
        // Buscamos usando los campos nativos de tus modelos
        const pacientes = await Paciente.findAll({ order: [['apellido', 'ASC']] });
        const medicos = await Profesional.findAll({ order: [['apellido', 'ASC']] }); 

        res.render('asignarTurno', {
            pacientes,
            medicos, 
            error: undefined,
            exito: undefined
        });
    } catch (error) {
        console.error('❌ Error al precargar profesionales y pacientes:', error);
        res.render('asignarTurno', {
            pacientes: [],
            medicos: [],
            error: 'No se pudieron cargar los datos clínicos desde la base de datos.',
            exito: undefined
        });
    }
};

// 2. GUARDAR EL TURNO (POST)
const postAsignarTurno = async (req, res) => {
    const { pacienteId, medicoId, fecha, hora, motivo } = req.body;

    try {
        // Convertimos explícitamente a enteros garantizando que no viaje un string vacío ''
        const idPacienteClean = parseInt(pacienteId, 10);
        const idMedicoClean = parseInt(medicoId, 10);

        if (!idPacienteClean || !idMedicoClean) {
            throw new Error('Debe seleccionar un paciente y un médico válidos.');
        }

        // 🔥 INSERT RESPETANDO TU TABLA DE SQL
        await Turno.create({
            id_paciente: idPacienteClean,
            id_profesional: idMedicoClean,
            id_consultorio: 1, // 👈 Pasamos un consultorio válido fijo para cumplir el NOT NULL del SQL
            fecha: fecha,
            hora: hora,
            motivo_consulta: motivo, // Mapea con la columna real de tu SQL
            estado: 'Reservado'       // Mapea con el estado de tu SQL
        });

        const listaPacientes = await Paciente.findAll({ order: [['apellido', 'ASC']] });
        const listaMedicos = await Profesional.findAll({ order: [['apellido', 'ASC']] });

        res.render('asignarTurno', {
            pacientes: listaPacientes,
            medicos: listaMedicos,
            error: undefined,
            exito: '¡Turno asignado y guardado físicamente en la base de datos!'
        });

    } catch (error) {
        console.error('❌ Error al insertar el turno en la BD:', error);
        
        const listaPacientes = await Paciente.findAll({ order: [['apellido', 'ASC']] });
        const listaMedicos = await Profesional.findAll({ order: [['apellido', 'ASC']] });
        
        res.render('asignarTurno', {
            pacientes: listaPacientes,
            medicos: listaMedicos,
            error: 'Ocurrió un error: Verifique las restricciones de claves foráneas en su SQL.',
            exito: undefined
        });
    }
};

// 3. VISTA PARA VER TODOS LOS TURNOS (GET)
const getVerTurnos = async (req, res) => {
    try {
        const listaTurnos = await Turno.findAll({
            include: [
                { model: Paciente, as: 'paciente' },
                { model: Profesional, as: 'profesional' }
            ],
            order: [['fecha', 'ASC'], ['hora', 'ASC']] // Ordenados por fecha y hora
        });

        res.render('verTurnos', {
            turnos: listaTurnos,
            error: undefined
        });
    } catch (error) {
        console.error('Error al recuperar listado de turnos:', error);
        res.render('verTurnos', {
            turnos: [],
            error: 'No se pudo cargar el listado de turnos desde la base de datos.'
        });
    }
};

module.exports = {
    getAsignarTurno,
    postAsignarTurno,
    getVerTurnos
};