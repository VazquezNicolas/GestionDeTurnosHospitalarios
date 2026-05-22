const express = require('express');
const path = require('path');
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

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Configuración del motor de plantillas EJS (La "V" de MVC)
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// Middlewares necesarios
app.use(express.urlencoded({ extended: true })); // Para entender los datos enviados por el formulario POST
app.use(express.static(path.join(__dirname, 'public'))); // Archivos estáticos (CSS, Imágenes)

// Mapeo de Rutas de Autenticación

app.get('/dashboard/admin', authController.getDashboardAdmin);

app.get('/auth/login', authController.getLogin);
app.post('/auth/login', authController.postLogin);

app.get('/pacientes/registrar', pacienteController.getRegistroPaciente);
app.post('/pacientes/registrar', pacienteController.postRegistroPaciente);

app.get('/medico/dashboard', medicoController.getDashboard);
app.post('/medico/disponibilidad', medicoController.postGuardarDisponibilidad);

app.get('/turnos/asignar', turnoController.getAsignarTurno); 
app.post('/turnos/asignar', turnoController.postAsignarTurno);

// Redirección por defecto al login
app.get('/', (req, res) => {
    res.redirect('/auth/login');
});

const inicializarSistema = async () => {
    await conectarDB();
    try {
        // alter: true le avisa a Sequelize que respete las tablas que hiciste en Workbench sin borrarlas
        await sequelize.sync({ alter: true });
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
