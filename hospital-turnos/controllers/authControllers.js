const Usuario = require('../models/usuarioModel');
const Paciente = require('../models/pacienteModel');
const Turno = require('../models/turnoModel');

// 1. RENDERIZAR LA VISTA DE LOGIN (GET)
const getLogin = (req, res) => {
    res.render('login', { error: undefined }); // Asume que tenés un views/login.ejs
};

// 2. PROCESAR EL FORMULARIO DE INGRESO (POST)

const getDashboardAdmin = async (req, res) => {
    try {
        // 1. Contamos de forma dinámica los registros de cada tabla en MySQL
        const totalPacientes = await Paciente.count();
        
        // Contamos los operadores activos (Rol 1 = Admin/Operador)
        const totalUsuarios = await Usuario.count({ where: { id_rol: 1 } }); 
        
        // Dejamos calculado también el contador de turnos por si te lo pide la línea 97
        const totalTurnos = await Turno.count(); 

        // 2. Le pasamos ABSOLUTAMENTE TODAS las variables que tu EJS necesita
        res.render('dashboardAdmin', {
            totalPacientes: totalPacientes,
            totalUsuarios: totalUsuarios, // 🔥 Soluciona el error de image_5f57ea.png
            totalTurnos: totalTurnos      // 🧠 Nos adelantamos al siguiente bloque del HTML
        });

    } catch (error) {
        console.error('❌ Error al cargar las estadísticas del admin:', error);
        // Enviamos valores en 0 para que al menos cargue la interfaz si falla la BD
        res.render('dashboardAdmin', {
            totalPacientes: 0,
            totalUsuarios: 0,
            totalTurnos: 0
        });
    }
};

const postLogin = async (req, res) => {
    const { username, password } = req.body;

    try {
        // Buscamos el usuario por su nombre_usuario mapeado de la BD
        const usuarioEncontrado = await Usuario.findOne({ 
            where: { nombre_usuario: username } 
        });

        // Validación de existencia y contraseña (respetando la columna 'contrasenia')
        if (!usuarioEncontrado || usuarioEncontrado.contrasenia !== password) {
            return res.render('login', { 
                error: 'Usuario o contraseña incorrectos.' 
            });
        }

        // Verificación de estado del usuario
        if (usuarioEncontrado.estado !== 'Active') {
            return res.render('login', { 
                error: 'El usuario se encuentra inactivo. Contacte al administrador.' 
            });
        }

        // 🌟 LA MAGIA DE LA SESIÓN: Guardamos los datos clave del usuario en el navegador
        req.session.id_usuario = usuarioEncontrado.id_usuario;
        req.session.nombre_usuario = usuarioEncontrado.nombre_usuario;
        req.session.id_rol = usuarioEncontrado.id_rol;
        
        // Guardamos la FK del profesional médico (si es admin, esto viajará como NULL automáticamente)
        req.session.id_profesional = usuarioEncontrado.id_profesional; 

        // Enrutamiento dinámico inteligente según el id_rol de tu SQL
        if (usuarioEncontrado.id_rol === 1) {
            // Rol: Administrador -> Al panel de gestión de turnos
            return res.redirect('/dashboard/admin');
        } else if (usuarioEncontrado.id_rol === 2) {
            // Rol: Médico -> A su agenda personal
            return res.redirect('/medico/dashboard');
        } else if (usuarioEncontrado.id_rol === 3) {
            // En caso de que configuren el rol 3 (Paciente) a futuro
            return res.redirect('/paciente/dashboard');
        } else {
            return res.redirect('/auth/login'); // 👈 Asegurate de que acá también diga /auth/login
        }

    } catch (error) {
        console.error('Error crítico en el proceso de autenticación:', error);
        res.render('/auth/login', { 
            error: 'Ocurrió un error en el servidor al intentar iniciar sesión.' 
        });
    }
};

// 3. CIERRE DE SESIÓN (GET)
const getLogout = (req, res) => {
    req.session.destroy(() => {
        res.redirect('/auth/login');
    });
};

module.exports = {
    getLogin,
    postLogin,
    getLogout,
    getDashboardAdmin
};