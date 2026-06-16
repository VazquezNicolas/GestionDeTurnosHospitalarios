const express = require('express');
const path = require('path');
const session = require('express-session');
const { esAdmin, esMedico } = require('./middelwares/authMiddleware');

//Config
const { conectarDB, sequelize } = require('./config/database');

//Controladores
const authController = require('./controllers/authControllers');
const pacienteController = require('./controllers/pacienteController');
const medicoController = require('./controllers/medicoController');
const turnoController = require('./controllers/turnoController');
const adminController = require ('./controllers/adminController')

console.log('CONTENIDO DE TURNO_CONTROLLER:', turnoController);

//Modelos
const Rol = require('./models/rolModel');
const Usuario = require('./models/usuarioModel');
const Paciente = require('./models/pacienteModel');
const Turno = require('./models/turnoModel');
const Especialidad = require('./models/especialidadModel');
const Atencion = require('./models/atencionModel');
const Profesional = require('./models/profesionalModel');

// 1. Relación Paciente ↔ Turno (Basado en la FK id_paciente de tu tabla 'turno')
Paciente.hasMany(Turno, { as: 'turnos', foreignKey: 'id_paciente' });
Turno.belongsTo(Paciente, { as: 'paciente', foreignKey: 'id_paciente' });

// 2. Relación Turno ↔ RegistroAtencion (Basado en la FK id_turno de 'registro_atencion')
Turno.hasOne(Atencion, { as: 'registro_atencion', foreignKey: 'id_turno' });
Atencion.belongsTo(Turno, { as: 'turno', foreignKey: 'id_turno' });

// 3. Relación Turno ↔ Profesional (Basado en la FK id_profesional de tu tabla 'turno')
Profesional.hasMany(Turno, { as: 'turnos', foreignKey: 'id_profesional' });
Turno.belongsTo(Profesional, { as: 'profesional', foreignKey: 'id_profesional' });

const app = express();
const PORT = 3000;

// Configuración del motor de plantillas EJS (La "V" de MVC)
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// Middlewares necesarios
app.use(express.static(path.join(__dirname, 'public'))); // Archivos estáticos (CSS, Imágenes)
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use(session({
    secret: 'secreto_para_el_tp_hospital', // Cambialo por algo seguro en producción
    resave: false,
    saveUninitialized: false,
    cookie: { 
        secure: false, // Poner en true solo si usás HTTPS
        maxAge: 1000 * 60 * 60 * 2 // 2 horas de duración
    }
}));

// Mapeo de Rutas de Autenticación
app.get('/auth/login', authController.getLogin);
app.post('/auth/login', authController.postLogin);
app.get('/auth/logout', authController.getLogout);

//Mapeo de Rutas de Medico
app.get('/medico/dashboard',esMedico, medicoController.getDashboard);
app.post('/medico/disponibilidad',esMedico, medicoController.postGuardarDisponibilidad);
app.get('/medico/atender/:id',esMedico, medicoController.getAtenderTurno);
app.post('/medico/atender',esMedico, medicoController.postAtenderTurno);
app.get('/medico/historial/:id_paciente',esMedico, medicoController.getHistorialPaciente);

// Mapeo de Rutas de Admin
app.get('/dashboard/admin', esAdmin,authController.getDashboardAdmin);

app.get('/pacientes/registrar', esAdmin, pacienteController.getRegistroPaciente);
app.post('/pacientes/registrar', esAdmin, pacienteController.postRegistroPaciente);
app.get('/api/pacientes/buscar', esAdmin, pacienteController.buscarApiPorDni);

app.get('/api/turnos/horarios-disponibles', esAdmin, turnoController.getHorariosDisponiblesApi);

app.get('/api/profesionales', esAdmin, medicoController.buscarApiPorEspecialidad);

app.get('/turnos/asignar', turnoController.getAsignarTurno); 
app.post('/turnos/asignar', turnoController.postAsignarTurno);
app.get('/turnos', turnoController.getVerTurnos);

// Rutas exclusivas del Administrador para la reprogramación de turnos
app.get('/admin/turnos/reprogramar', esAdmin, adminController.getReprogramarTurnos);
app.post('/admin/turnos/reprogramar/guardar', esAdmin, adminController.postGuardarReprogramacion);
app.post('/admin/turnos/cancelar', esAdmin, adminController.postCancelarTurnoAdmin);
app.get('/admin/pacientes/gestion', esAdmin, adminController.getGestionPacientes);
app.post('/admin/pacientes/editar', esAdmin, adminController.postEditarPacienteAdmin);

app.get('/admin/medicos/nuevo', esAdmin, adminController.getAgregarMedico);
app.post('/admin/medicos/nuevo', esAdmin, adminController.postAgregarMedico);

app.get('/admin/medicos/gestion', esAdmin, adminController.getGestionMedicos);
app.post('/admin/medicos/editar', esAdmin, adminController.postEditarMedicoAdmin);
app.post('/admin/medicos/eliminar', esAdmin, adminController.postEliminarMedicoAdmin);

app.get('/admin/especialidades/gestion', esAdmin, adminController.getGestionEspecialidades);
app.post('/admin/especialidades/agregar', esAdmin, adminController.postAgregarEspecialidad);
app.post('/admin/especialidades/editar', esAdmin, adminController.postEditarEspecialidad);
app.post('/admin/especialidades/eliminar', esAdmin, adminController.postEliminarEspecialidad);

app.get('/admin/disponibilidad/gestion', esAdmin, adminController.getGestionDisponibilidad);
app.post('/admin/disponibilidad/generar', esAdmin, adminController.postGenerarDisponibilidad);
app.post('/admin/disponibilidad/eliminar', esAdmin, adminController.postEliminarDisponibilidad);


app.get('/admin/medicos/agregar', esAdmin, adminController.getAgregarMedico);
app.post('/admin/medicos/agregar', esAdmin, adminController.postAgregarMedico);

app.post('/admin/medicos/regenerar-agenda', esAdmin, adminController.postRegenerarAgendaMedico);

app.get('/api/disponibilidad/fechas', esAdmin, adminController.getFechasDisponiblesAPI);
app.get('/api/disponibilidad/horas', esAdmin, adminController.getHorasDisponiblesAPI);

// Redirección por defecto al login
app.get('/', (req, res) => {
    res.redirect('/auth/login');
});

const inicializarSistema = async () => {
    await conectarDB();
    try {
        // alter: true le avisa a Sequelize que respete las tablas que hiciste en Workbench sin borrarlas
        await sequelize.sync({ alter: false });
        console.log('Modelos de Sequelize vinculados con las tablas de MySQL con éxito.');
    } catch (err) {
        console.error('Error al sincronizar modelos con MySQL:', err);
    }
};
inicializarSistema();

// Inicio del servidor
app.listen(PORT, () => {
    console.log(`Servidor de PP4 corriendo en: http://localhost:${PORT}`);
});
