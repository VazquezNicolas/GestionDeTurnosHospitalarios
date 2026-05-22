// Traemos los mismos horarios disponibles que usamos antes
// (Hacemos que sea global o accesible para ambos controladores)
global.turnosDisponiblesMock = global.turnosDisponiblesMock || [
    { id_disp: 1, profesionalId: 101, fecha: '2026-06-01', hora: '09:00' },
    { id_disp: 2, profesionalId: 101, fecha: '2026-06-01', hora: '10:00' }
];

// Traemos los turnos que ya fueron asignados por el administrativo
global.turnosAsignadosMock = global.turnosAsignadosMock || [];

exports.getDashboard = async (req, res) => {
    try {
        // Dejamos preparada la lógica para cuando completemos el módulo de turnos
        // const cantidadTurnos = await Turno.count({ where: { medicoId: req.session.usuarioId } });
        const turnosPendientesHoy = 0; 

        // Renderizamos la vista del médico pasándole sus estadísticas correspondientes
        res.render('dashboardMedico', {
            turnosPendientes: turnosPendientesHoy,
            error: undefined
        });
    } catch (error) {
        console.error('Error al cargar el Dashboard del Médico:', error);
        res.render('dashboardMedico', {
            turnosPendientes: 0,
            error: 'No se pudieron sincronizar sus turnos en tiempo real.'
        });
    }
};

// RF-06: Configurar / Agregar nueva disponibilidad
exports.postGuardarDisponibilidad = (req, res) => {
    const medicoId = 101; // Simulado
    const { fecha, hora } = req.body;

    // Crear la nueva disponibilidad en el pool global
    const nuevaDisp = {
        id_disp: global.turnosDisponiblesMock.length + 1,
        profesionalId: medicoId,
        fecha: fecha,
        hora: hora
    };

    global.turnosDisponiblesMock.push(nuevaDisp);
    console.log('Nueva disponibilidad agregada por el médico:', nuevaDisp);

    // Redirigir de nuevo al panel para ver los cambios reflejados
    res.redirect('/medico/dashboard');
};