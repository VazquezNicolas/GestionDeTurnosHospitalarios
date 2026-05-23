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

console.log('CONTENIDO DE TURNO_CONTROLLER:', turnoController);

//Modelos
const Rol = require('./models/rolModel');
const Usuario = require('./models/usuarioModel');
const Paciente = require('./models/pacienteModel');
const Turno = require('./models/turnoModel');

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

app.get('/medico/dashboard', medicoController.getDashboard);
app.post('/medico/disponibilidad', medicoController.postGuardarDisponibilidad);
app.get('/medico/atender/:id', medicoController.getAtenderTurno);
app.post('/medico/atender', medicoController.postAtenderTurno);
app.get('/medico/historial/:id_paciente', medicoController.getHistorialPaciente);

app.get('/turnos/asignar', turnoController.getAsignarTurno); 
app.post('/turnos/asignar', turnoController.postAsignarTurno);
app.get('/turnos', turnoController.getVerTurnos);



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
