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

    // Buscar si el usuario existe y coincide la contraseña
    const usuarioEncontrado = usuariosMock.find(
        u => u.user === username && u.pass === password
    );

    if (usuarioEncontrado) {
        // En un sistema real, acá guardaríamos la sesión (req.session.user)
        console.log(`Logueado con éxito como: ${usuarioEncontrado.rol}`);
        
        // Redirección dinámica según el Rol detallado en su documentación
        switch (usuarioEncontrado.rol) {
            case 'Administrador':
                return res.send('<h1>Panel de Administrador (Próximamente)</h1>');
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
        // Si falla, vuelve a renderizar el Login pero pasándole un mensaje de error
        res.render('login', { error: 'Usuario o contraseña incorrectos.' });
    }
};
