// middlewares/authMiddleware.js

const authMiddleware = {
    // Middleware para Administradores (rol 1)
    esAdmin: (req, res, next) => {
        if (req.session && req.session.id_rol === 1) {
            return next(); // ¡Adelante!
        }
        res.redirect('/auth/login?error=Acceso+denegado:+Requiere+permisos+de+administrador');
    },

    // Middleware para Médicos (rol 2 - supuesto)
    esMedico: (req, res, next) => {
        if (req.session && req.session.id_rol === 2) {
            return next();
        }
        res.redirect('/auth/login?error=Acceso+denegado:+Solo+para+personal+médico');
    }
};

module.exports = authMiddleware;