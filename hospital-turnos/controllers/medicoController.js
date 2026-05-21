// Traemos los mismos horarios disponibles que usamos antes
// (Hacemos que sea global o accesible para ambos controladores)
global.turnosDisponiblesMock = global.turnosDisponiblesMock || [
    { id_disp: 1, profesionalId: 101, fecha: '2026-06-01', hora: '09:00' },
    { id_disp: 2, profesionalId: 101, fecha: '2026-06-01', hora: '10:00' }
];

// Traemos los turnos que ya fueron asignados por el administrativo
global.turnosAsignadosMock = global.turnosAsignadosMock || [];

exports.getDashboard = (req, res) => {
    // Simulamos que se logueó el Dr. Gonzalo Cerimedo (ID: 101)
    const medicoId = 101;
    const miInfo = profesionalesMock.find(m => m.id === medicoId);

    // Filtrar las disponibilidades creadas por este médico (RF-06)
    const misHorarios = global.turnosDisponiblesMock.filter(h => h.profesionalId === medicoId);

    // Filtrar los turnos que los pacientes ya le reservaron (Agenda diaria / RF-25)
    const misTurnosReservados = global.turnosAsignadosMock.filter(t => t.profesionalId === medicoId);

    res.render('dashboardMedico', {
        medico: miInfo,
        misHorarios: misHorarios,
        misTurnos: misTurnosReservados,
        success: undefined
    });
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