// Simulación temporal de la tabla Paciente en la Base de Datos
const pacientesMock = [
    { id: 1, dni: '12345678', nombre: 'Juan', apellido: 'Pérez', fechaNac: '1990-05-15', telefono: '1122334455', email: 'juan@email.com' }
];

// Vista del formulario de registro
exports.getRegistrar = (req, res) => {
    res.render('registrarPaciente', { error: undefined, success: undefined });
};

// Acción de registrar (POST)
exports.postRegistrar = (req, res) => {
    const { dni, nombre, apellido, fechaNac, telefono, email } = req.body; // [cite: 233]

    // Validación del RF-01: Validar que el DNI no esté duplicado 
    const existePaciente = pacientesMock.find(p => p.dni === dni);

    if (existePaciente) {
        return res.render('registrarPaciente', { 
            error: `El DNI ${dni} ya se encuentra registrado en el sistema.`,
            success: undefined 
        });
    }

    // Si no existe, simulamos el guardado en la base de datos
    const nuevoPaciente = {
        id: pacientesMock.length + 1,
        dni,
        nombre,
        apellido,
        fechaNac,
        telefono,
        email
    };
    pacientesMock.push(nuevoPaciente);
    
    console.log('Pacientes registrados actualmente:', pacientesMock);

    res.render('registrarPaciente', { 
        error: undefined, 
        success: `Paciente ${nombre} ${apellido} registrado con éxito.` 
    });
};