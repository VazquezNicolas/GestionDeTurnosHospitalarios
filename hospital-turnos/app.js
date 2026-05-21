const express = require('express');
const path = require('path');

//Controladores
const authController = require('./controllers/authControllers');
const pacienteController = require('./controllers/pacienteController');
const medicoController = require('./controllers/medicoController');
const turnoController = require('./controllers/turnoController');

const app = express();
const PORT = 3000;

// Configuración del motor de plantillas EJS (La "V" de MVC)
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// Middlewares necesarios
app.use(express.urlencoded({ extended: true })); // Para entender los datos enviados por el formulario POST
app.use(express.static(path.join(__dirname, 'public'))); // Archivos estáticos (CSS, Imágenes)

// Mapeo de Rutas de Autenticación
app.get('/auth/login', authController.getLogin);
app.post('/auth/login', authController.postLogin);

app.get('/pacientes/registrar', pacienteController.getRegistrar);
app.post('/pacientes/registrar', pacienteController.postRegistrar);

app.get('/medico/dashboard', medicoController.getDashboard);
app.post('/medico/disponibilidad', medicoController.postGuardarDisponibilidad);

app.get('/turnos/assignar', turnoController.getAsignarTurno); // Nota: mantener coherencia url o usar /turnos/asignar
app.get('/turnos/asignar', turnoController.getAsignarTurno); 
app.post('/turnos/asignar', turnoController.postAsignarTurno);

// Redirección por defecto al login
app.get('/', (req, res) => {
    res.redirect('/auth/login');
});

// Inicio del servidor
app.listen(PORT, () => {
    console.log(`Servidor de PP4 corriendo en: http://localhost:${PORT}`);
});
