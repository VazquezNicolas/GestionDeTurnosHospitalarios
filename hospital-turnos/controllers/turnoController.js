const Paciente = require('../models/pacienteModel');
const Usuario = require('../models/usuarioModel'); // Asumiendo que los médicos están en Usuario o tienen su propio modelo
const Profesional = require('../models/profesionalModel');
// const Turno = require('../models/turnoModel'); // Descomentar cuando tengan el modelo de Turno listo

// 1. Cargar el formulario con datos reales de la BD
exports.getAsignarTurno = async (req, res) => {
    try {
        const pacientes = await Paciente.findAll({ order: [['apellido', 'ASC']] });
        
        // Buscamos directo en la tabla profesional, ordenados por apellido
        const medicos = await Profesional.findAll({ order: [['apellido', 'ASC']] }); 

        res.render('asignarTurno', {
            pacientes,
            medicos, // Ahora viaja la lista de profesionales reales
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

// 2. Procesar y guardar el turno en MySQL
// 2. Procesar el envío del formulario del turno
exports.postAsignarTurno = async (req, res) => {
    // Capturamos lo que viaja desde el formulario
    const { pacienteId, medicoId, fecha, hora, motivo } = req.body;

    try {
        // [Simulación de guardado temporal] 
        // Cuando activen el modelo de turnos, acá irá: await Turno.create({...});
        console.log(`Turno recibido: Paciente ${pacienteId}, Médico ${medicoId}, el ${fecha} a las ${hora}`);

        // VOLVEMOS A CARGAR LAS LISTAS para que la vista las pueda dibujar de nuevo
        const listaPacientes = await Paciente.findAll({ order: [['apellido', 'ASC']] });
        const listaMedicos = await Profesional.findAll({ order: [['apellido', 'ASC']] });

        // Renderizamos con el cartel verde de éxito
        res.render('asignarTurno', {
            pacientes: listaPacientes,  // El nombre acá DEBE ser 'pacientes' para matchear con el .ejs
            medicos: listaMedicos,      // El nombre acá DEBE ser 'medicos'
            error: undefined,
            exito: '¡Turno asignado y programado con éxito en el sistema!'
        });

    } catch (error) {
        console.error('Error interno en postAsignarTurno:', error);
        
        // Salvaguarda por si explota cualquier consulta, para que no tire "is not defined"
        try {
            const listaPacientes = await Paciente.findAll({ order: [['apellido', 'ASC']] });
            const listaMedicos = await Profesional.findAll({ order: [['apellido', 'ASC']] });
            
            res.render('asignarTurno', {
                pacientes: listaPacientes,
                medicos: listaMedicos,
                error: 'Ocurrió un error interno al intentar guardar el turno.',
                exito: undefined
            });
        } catch (errCritico) {
            // Si llega a fallar la base de datos por completo, mandamos arrays vacíos para evitar el crash
            res.render('asignarTurno', {
                pacientes: [],
                medicos: [],
                error: 'Error crítico de conexión con la base de datos.',
                exito: undefined
            });
        }
    }
};