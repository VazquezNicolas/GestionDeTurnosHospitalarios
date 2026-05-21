global.profesionalesMock = global.profesionalesMock || [
    { id: 101, nombre: 'Dr. Gonzalo Cerimedo', especialidad: 'Cardiología' },
    { id: 102, nombre: 'Dr. Marcos Gamarra', especialidad: 'Pediatría' }
];

const turnosDisponiblesMock = [
    { id_disp: 1, profesionalId: 101, fecha: '2026-06-01', hora: '09:00' },
    { id_disp: 2, profesionalId: 101, fecha: '2026-06-01', hora: '10:00' },
    { id_disp: 3, profesionalId: 102, fecha: '2026-06-02', hora: '09:00' }
];
// Historial de turnos ya ocupados/reservados [cite: 194]
const turnosAsignadosMock = [];

// Vista para mostrar el formulario de asignación 
exports.getAsignarTurno = (req, res) => {
    res.render('asignarTurno', { 
        profesionales: global.profesionalesMock, 
        horarios: turnosDisponiblesMock,
        error: undefined, 
        success: undefined 
    });
};

// Acción de registrar el turno (POST) 
exports.postAsignarTurno = (req, res) => {
    const { pacienteDni, profesionalId, turnoIdDisp } = req.body;

    // Buscar el horario seleccionado en las disponibilidades
    const horarioSeleccionado = turnosDisponiblesMock.find(h => h.id_disp == turnoIdDisp);

    // RF-12: Validar superposición de turnos para un mismo profesional y horario 
    const turnoSuperpuesto = turnosAsignadosMock.find(t => 
        t.profesionalId == profesionalId && 
        t.fecha === horarioSeleccionado.fecha && 
        t.hora === horarioSeleccionado.hora
    );

    if (turnoSuperpuesto) {
        return res.render('asignarTurno', {
            profesionales: global.profesionalesMock,
            horarios: turnosDisponiblesMock,
            error: 'Error (RF-12): El profesional ya tiene un turno asignado en ese horario.',
            success: undefined
        });
    }

    // Si está libre, se asigna el turno (RF-08) 
    const nuevoTurno = {
        id_turno: turnosAsignadosMock.length + 1,
        pacienteDni,
        profesionalId: parseInt(profesionalId),
        fecha: horarioSeleccionado.fecha,
        hora: horarioSeleccionado.hora,
        estado: 'Reservado'
    };

    turnosAsignadosMock.push(nuevoTurno);
    console.log('Turnos asignados en el sistema:', turnosAsignadosMock);

    res.render('asignarTurno', {
        profesionales: global.profesionalesMock,
        horarios: turnosDisponiblesMock,
        error: undefined,
        success: `Turno asignado con éxito para el paciente DNI ${pacienteDni}.`
    });
};