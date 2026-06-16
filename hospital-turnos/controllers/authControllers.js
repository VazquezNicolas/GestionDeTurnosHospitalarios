const Paciente = require('../models/pacienteModel');
const Usuario = require('../models/usuarioModel');
const Profesional = require('../models/profesionalModel');
const Especialidad = require('../models/especialidadModel');
const Turno = require('../models/turnoModel');
const { Op } = require('sequelize');
const bcrypt = require('bcrypt');

// 1. RENDERIZAR LA VISTA DE LOGIN (GET)
const getLogin = (req, res) => {
    res.render('login', { error: undefined }); // Asume que tenés un views/login.ejs
};

// 2. PROCESAR EL FORMULARIO DE INGRESO (POST)

const getDashboardAdmin = async (req, res) => {
    try {
        if (!req.session || req.session.id_rol !== 1) {
            return res.redirect('/auth/login');
        }
// Generamos la fecha actual en el formato de tu base de datos (YYYY-MM-DD)
        const hoy = new Date().toISOString().split('T')[0];

        // Turnos vigentes (Reservados y que la fecha sea mayor o igual a hoy)

        // Consultas simultáneas a la base de datos (RF-23)
        const totalPacientes = await Paciente.count();
        const totalUsuarios = 1;
        const totalMedicos = await Profesional.count();
        const totalEspecialidades = await Especialidad.count();
        
        // Turnos vigentes (ejemplo: estado 'Reservado')
        const turnosActivos = await Turno.count({ 
            where: { 
                estado: 'Reservado',
                fecha: {
                    [Op.gte]: hoy // Op.gte significa "Greater Than or Equal" (Mayor o igual a)
                }
            } 
        });
        
        // Turnos históricos (Absolutamente todos los turnos en la tabla)
        const turnosHistoricos = await Turno.count();

        res.render('dashboardAdmin', { // Asegurate de que este sea el nombre de tu archivo ejs
            totalPacientes,
            totalUsuarios,
            totalMedicos,
            totalEspecialidades,
            turnosActivos,
            turnosHistoricos
        });

    } catch (error) {
        console.error('Error al cargar panel de administración:', error);
        res.render('dashboardAdmin', { error: 'No se pudieron cargar las estadísticas.' });
    }
};

const postLogin = async (req, res) => {
    const { username, password } = req.body;

    try {
        // 1. Buscamos el usuario por su nombre_usuario mapeado de la BD
        const usuarioEncontrado = await Usuario.findOne({ 
            where: { nombre_usuario: username } 
        });

        // 2. Si el usuario no existe, rebotamos con mensaje genérico por seguridad
        if (!usuarioEncontrado) {
            return res.render('login', { 
                error: 'Usuario o contraseña incorrectos.' 
            });
        }

        // 3. LA MAGIA DE BCRYPT: Comparamos el texto plano con el hash guardado en la BD
        const passwordValida = await bcrypt.compare(password, usuarioEncontrado.contrasenia);

        // Si la validación falla, rebotamos
        if (!passwordValida) {
            return res.render('login', { 
                error: 'Usuario o contraseña incorrectos.' 
            });
        }

        // 4. Verificación de estado del usuario
        if (usuarioEncontrado.estado !== 'Active') {
            return res.render('login', { 
                error: 'El usuario se encuentra inactivo. Contacte al administrador.' 
            });
        }

        // 5. LA MAGIA DE LA SESIÓN: Guardamos los datos clave del usuario en el navegador
        req.session.id_usuario = usuarioEncontrado.id_usuario;
        req.session.nombre_usuario = usuarioEncontrado.nombre_usuario;
        req.session.id_rol = usuarioEncontrado.id_rol;
        
        // Guardamos la FK del profesional médico (si es admin, esto viajará como NULL automáticamente)
        req.session.id_profesional = usuarioEncontrado.id_profesional; 

        // 6. Enrutamiento dinámico inteligente según el id_rol de tu SQL
        if (usuarioEncontrado.id_rol === 1) {
            // Rol: Administrador -> Al panel de gestión principal
            return res.redirect('/dashboard/admin');
        } else if (usuarioEncontrado.id_rol === 2) {
            // Rol: Médico -> A su agenda personal
            return res.redirect('/medico/dashboard');
        } else if (usuarioEncontrado.id_rol === 3) {
            // En caso de que configuren el rol 3 (Paciente) a futuro
            return res.redirect('/paciente/dashboard');
        } else {
            return res.redirect('/auth/login');
        }

    } catch (error) {
        console.error('Error crítico en el proceso de autenticación:', error);
        // Corrección: res.render usa el nombre de la vista ('login'), no la ruta de la URL
        res.render('login', { 
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