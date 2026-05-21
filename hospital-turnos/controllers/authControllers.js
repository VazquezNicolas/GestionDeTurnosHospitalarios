const usuariosMock = [
    { user: 'admin', pass: 'admin123', rol: 'Administrador' },
    { user: 'medico', pass: 'medico123', rol: 'Profesional' },
    { user: 'paciente', pass: 'paciente123', rol: 'Paciente' },
    { user: 'lab', pass: 'lab123', rol: 'Laboratorio' }
];

exports.getLogin = (req, res) => {
    // Renderiza la vista login.ejs
    res.render('login');
};

exports.postLogin = (req, res) => {
    const { username, password } = req.body;

    const usuarioEncontrado = usuariosMock.find(
        u => u.user === username && u.pass === password
    );

    if (usuarioEncontrado) {
        console.log(`Logueado con éxito como: ${usuarioEncontrado.rol}`);
        
        // Modificamos el ruteo dinámico según el Rol
        switch (usuarioEncontrado.rol) {
            case 'Administrador':
                // En vez de un res.send, ahora renderizamos la vista del Dashboard
                return res.render('dashboardAdmin');
            case 'Profesional':
                return res.send('<h1>Panel Médico (Próximamente)</h1>');
            case 'Paciente':
                return res.send('<h1>Portal del Paciente (Próximamente)</h1>');
            case 'Laboratorio':
                return res.send('<h1>Módulo de Laboratorio (Próximamente)</h1>');
            default:
                return res.redirect('/auth/login');
        }
    } else {
        res.render('login', { error: 'Usuario o contraseña incorrectos.' });
    }
};