// 1. IMPORTAMOS EL MODELO REAL DESDE NUESTRA CARPETA
const Usuario = require('../models/usuarioModel');
const Rol = require('../models/rolModel'); // Lo importamos para poder leer el nombre del rol en el JOIN
const Paciente = require('../models/pacienteModel');

// Vista para renderizar el formulario de login (Queda igual)
exports.getLogin = (req, res) => {
    res.render('login', { error: undefined });
};

// Acción de validar el Login (POST) - Ahora es ASÍNCRONA para esperar a la Base de Datos
exports.postLogin = async (req, res) => {
    const { username, password } = req.body;

    try {
        // 2. CONSULTA REAL A MYSQL: Busca un usuario que coincida con el nombre tipeado
        // Usamos "include" que es el equivalente al INNER JOIN de Sequelize
        const usuarioEncontrado = await Usuario.findOne({
            where: { nombre_usuario: username },
            include: [{ model: Rol, as: 'rol' }] // Se trae los datos del rol asociado
        });

        console.log('--- DETECTOR DE LOGIN ---');
        console.log('Datos tipeados en el navegador -> Usuario:', username, '| Contraseña:', password);
        console.log('Datos reales de la Base de Datos -> Encontrado:', usuarioEncontrado ? 'SÍ' : 'NO', '| Contraseña en BD:', usuarioEncontrado ? usuarioEncontrado.contrasena : 'N/A');

        // 3. VALIDACIÓN DE CREDENCIALES
        // Verificamos si el usuario existe y si la contraseña coincide con la de la tabla
        if (usuarioEncontrado && usuarioEncontrado.contrasena === password) {
            
            console.log(`Logueado con éxito desde MySQL. Rol: ${usuarioEncontrado.rol.nombre_rol}`);
            
            // 4. DIRECCIONAMIENTO SEGÚN EL ROL REAL DE LA BASE DE DATOS
            switch (usuarioEncontrado.rol.nombre_rol) {
                case 'Administrador':
                    return res.redirect('/dashboard/admin');
                case 'Profesional':
                    return res.redirect('/medico/dashboard');
                case 'Paciente':
                    return res.send('<h1>Portal del Paciente (Próximamente)</h1>');
                case 'Laboratorio':
                    return res.send('<h1>Módulo de Laboratorio (Próximamente)</h1>');
                default:
                    return res.redirect('/auth/login');
            }
        } else {
            // Si el usuario no existe o la contraseña está mal
            return res.render('login', { error: 'Usuario o contraseña incorrectos.' });
        }

    } catch (error) {
        console.error(' Error al validar el login en la base de datos:', error);
        return res.render('login', { error: 'Ocurrió un error interno en el servidor.' });
    }
};

exports.getDashboardAdmin = async (req, res) => {
    try {
        // Consultas en tiempo real a MySQL
        const totalPacientes = await Paciente.count();
        const totalUsuarios = await Usuario.count({ where: { estado: 'Activo' } });

        // Renderizamos la vista pasando las métricas correspondientes
        res.render('dashboardAdmin', { 
            totalPacientes, 
            totalUsuarios,
            error: undefined 
        });
    } catch (error) {
        console.error('❌ Error al cargar las métricas del Dashboard:', error);
        res.render('dashboardAdmin', { 
            totalPacientes: 0, 
            totalUsuarios: 0, 
            error: 'No se pudieron cargar las estadísticas en tiempo real.' 
        });
    }
};