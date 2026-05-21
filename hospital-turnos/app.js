const express = require('express');
const path = require('path');
const authController = require('./controllers/authControllers');

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

// Redirección por defecto al login
app.get('/', (req, res) => {
    res.redirect('/auth/login');
});

// Inicio del servidor
app.listen(PORT, () => {
    console.log(`Servidor de PP4 corriendo en: http://localhost:${PORT}`);
});
