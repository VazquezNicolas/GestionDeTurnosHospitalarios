const express = require('express');
const path = require('path');
const session = require('express-session');

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

app.get('/dashboard/admin', authController.getDashboardAdmin);
app.get('/auth/login', authController.getLogin);
app.post('/auth/login', authController.postLogin);
app.get('/auth/logout', authController.getLogout);


app.get('/pacientes/registrar', pacienteController.getRegistroPaciente);
app.post('/pacientes/registrar', pacienteController.postRegistroPaciente);
app.get('/api/pacientes/buscar', pacienteController.buscarApiPorDni);
app.get('/api/turnos/horarios-disponibles', turnoController.getHorariosDisponiblesApi);

app.get('/api/profesionales', medicoController.buscarApiPorEspecialidad);
app.get('/medico/dashboard', medicoController.getDashboard);
app.post('/medico/disponibilidad', medicoController.postGuardarDisponibilidad);
app.get('/medico/atender/:id', medicoController.getAtenderTurno);
app.post('/medico/atender', medicoController.postAtenderTurno);
app.get('/medico/historial/:id_paciente', medicoController.getHistorialPaciente);


app.get('/turnos/asignar', turnoController.getAsignarTurno); 
app.post('/turnos/asignar', turnoController.postAsignarTurno);
app.get('/turnos', turnoController.getVerTurnos);

//app.post('/admin/turnos/asignar', adminController.postAsignarTurno);
//app.get('/admin/turnos/asignar', adminController.getAsignarTurno);

// Rutas exclusivas del Administrador para la reprogramación de turnos
app.get('/admin/turnos/reprogramar', adminController.getReprogramarTurnos);
app.post('/admin/turnos/reprogramar/guardar', adminController.postGuardarReprogramacion);
app.post('/admin/turnos/cancelar', adminController.postCancelarTurnoAdmin);
app.get('/admin/pacientes/gestion', adminController.getGestionPacientes);
app.post('/admin/pacientes/editar', adminController.postEditarPacienteAdmin);

app.get('/admin/medicos/nuevo', adminController.getAgregarMedico);
app.post('/admin/medicos/nuevo', adminController.postAgregarMedico);

app.get('/admin/medicos/gestion', adminController.getGestionMedicos);
app.post('/admin/medicos/editar', adminController.postEditarMedicoAdmin);
app.post('/admin/medicos/eliminar', adminController.postEliminarMedicoAdmin);

app.get('/admin/especialidades/gestion', adminController.getGestionEspecialidades);
app.post('/admin/especialidades/agregar', adminController.postAgregarEspecialidad);
app.post('/admin/especialidades/editar', adminController.postEditarEspecialidad);
app.post('/admin/especialidades/eliminar', adminController.postEliminarEspecialidad);


app.get('/admin/disponibilidad/gestion', adminController.getGestionDisponibilidad);
app.post('/admin/disponibilidad/generar', adminController.postGenerarDisponibilidad);
app.post('/admin/disponibilidad/eliminar', adminController.postEliminarDisponibilidad);


app.get('/admin/medicos/agregar', adminController.getAgregarMedico);
app.post('/admin/medicos/agregar', adminController.postAgregarMedico);

app.post('/admin/medicos/regenerar-agenda', adminController.postRegenerarAgendaMedico);

app.get('/api/disponibilidad/fechas', adminController.getFechasDisponiblesAPI);
app.get('/api/disponibilidad/horas', adminController.getHorasDisponiblesAPI);

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
