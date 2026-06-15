const Paciente = require('../models/pacienteModel');
const Profesional = require('../models/profesionalModel');
const Turno = require('../models/turnoModel');
const Especialidad = require('../models/especialidadModel');
const Disponibilidad = require('../models/disponibilidadModel');

const getAsignarTurno = async (req, res) => {
    try {
        // Traemos las especialidades para el combo de filtrado dinámico
        const especialidades = await Especialidad.findAll({ order: [['nombre', 'ASC']] });

        res.render('asignarTurno', {
            especialidades, // <-- Enviamos especialidades reales a la vista
            error: undefined,
            exito: undefined
        });
    } catch (error) {
        console.error('Error al precargar datos clínicos:', error);
        res.render('asignarTurno', {
            especialidades: [],
            error: 'No se pudieron cargar las especialidades desde la base de datos.',
            exito: undefined
        });
    }
};

// 2. GUARDAR EL TURNO (POST)
// Acción: Procesar la asignación de un nuevo turno (POST)
const postAsignarTurno = async (req, res) => {
    const { id_paciente, id_profesional, fecha, hora, motivo_consulta } = req.body;

    try {
        if (!req.session || req.session.id_rol !== 1) return res.redirect('/auth/login');

        // 1. Validación de datos vacíos
        if (!id_paciente || !id_profesional || !fecha || !hora) {
            return res.redirect('/turnos/asignar?error=Por+favor,+complete+todos+los+campos+obligatorios.');
        }

        // 2. REGLA DE NEGOCIO: Validar que la fecha y hora no sean del pasado (Backend Check)
        const hoyStr = new Date().toISOString().split('T')[0];
        const ahoraStr = new Date().toTimeString().split(' ')[0];
        
        if (fecha < hoyStr) {
            return res.redirect('/turnos/asignar?error=Operación+denegada:+No+se+pueden+asignar+turnos+en+fechas+pasadas.');
        }
        if (fecha === hoyStr && hora < ahoraStr) {
            return res.redirect('/turnos/asignar?error=Operación+denegada:+Ese+horario+ya+ha+transcurrido+en+el+día+de+hoy.');
        }

        // 3. REGLA DE NEGOCIO (RF-12): Prevenir superposición de turnos
        const turnoExistente = await Turno.findOne({
            where: { 
                id_profesional: parseInt(id_profesional, 10), 
                fecha: fecha, 
                hora: hora,
                estado: 'Reservado' // Solo nos importa si el turno activo choca
            }
        });

        if (turnoExistente) {
            return res.redirect('/turnos/asignar?error=El+horario+seleccionado+acaba+de+ser+reservado+por+otro+operador.+Por+favor,+elija+otro.');
        }

        // 4. Inserción segura del turno en la base de datos
        await Turno.create({
            id_paciente: parseInt(id_paciente, 10),
            id_profesional: parseInt(id_profesional, 10),
            fecha: fecha,
            hora: hora,
            motivo_consulta: motivo_consulta ? motivo_consulta.trim() : 'Consulta general',
            estado: 'Reservado'
            // id_consultorio ya no es necesario aquí
        });

        return res.redirect('/turnos/asignar?exito=El+turno+ha+sido+asignado+y+reservado+correctamente.');

    } catch (error) {
        console.error('Error crítico al asignar turno:', error);
        return res.redirect('/turnos/asignar?error=Ocurrió+un+error+interno+al+intentar+registrar+el+turno.');
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

// Endpoint API: Calcular los horarios libres de un médico para un día específico
const getHorariosDisponiblesApi = async (req, res) => {
    const { id_profesional, fecha } = req.query;

    try {
        if (!id_profesional || !fecha) {
            return res.status(400).json({ error: 'Faltan parámetros requeridos.' });
        }

        const idProf = parseInt(id_profesional, 10);
        
        // --- NUEVO: Obtener fecha y hora actual en tiempo real ---
        const ahora = new Date();
        const yyyy = ahora.getFullYear();
        const mm = String(ahora.getMonth() + 1).padStart(2, '0');
        const dd = String(ahora.getDate()).padStart(2, '0');
        const fechaHoyStr = `${yyyy}-${mm}-${dd}`;
        
        // Si el operador metió una fecha anterior a hoy de forma manual (burlando el frontend)
        if (fecha < fechaHoyStr) {
            return res.json([]); // Devolvemos cero horarios disponibles
        }

        const horariosPorDefecto = [
            "08:00", "08:15", "08:30", "08:45",
            "09:00", "09:15", "09:30", "09:45",
            "10:00", "10:15", "10:30", "10:45",
            "11:00", "11:15", "11:30", "11:45",
            "14:00", "14:15", "14:30", "14:45",
            "15:00", "15:15", "15:30", "15:45",
            "16:00", "16:15", "16:30", "16:45",
            "17:00", "17:15", "17:30", "17:45"
        ];

        const horariosProhibidos = new Set();

        // Buscamos bloqueos (Disponibilidad) y reservas (Turno) exactamente igual que antes...
        const bloqueosExcepcionales = await Disponibilidad.findAll({
            where: { id_profesional: idProf, fecha: fecha },
            attributes: ['hora']
        });
        bloqueosExcepcionales.forEach(b => horariosProhibidos.add(b.hora.substring(0, 5)));

        const turnosOcupados = await Turno.findAll({
            where: { id_profesional: idProf, fecha: fecha, estado: 'Reservado' },
            attributes: ['hora']
        });
        turnosOcupados.forEach(t => horariosProhibidos.add(t.hora.substring(0, 5)));

        // --- NUEVO: Filtrar agenda teórica contemplando el paso del tiempo ---
        const horariosLibres = horariosPorDefecto
            .filter(horaSlot => {
                // Si la fecha elegida es HOY, evaluamos si el slot ya caducó
                if (fecha === fechaHoyStr) {
                    const horaActualStr = ahora.toTimeString().substring(0, 5); // Ej: "14:32"
                    if (horaSlot <= horaActualStr) {
                        return false; // Descartamos la hora porque ya pasó
                    }
                }
                
                // Si no es hoy o es una hora futura, aplicamos la exclusión común de reservas
                return !horariosProhibidos.has(horaSlot);
            })
            .map(horaSlot => `${horaSlot}:00`);

        return res.json(horariosLibres);

    } catch (error) {
        console.error('Error crítico al calcular horarios disponibles con validación temporal:', error);
        return res.status(500).json({ error: 'Error interno en el servidor.' });
    }
};

module.exports = {
    getAsignarTurno,
    postAsignarTurno,
    getVerTurnos,
    getHorariosDisponiblesApi
};