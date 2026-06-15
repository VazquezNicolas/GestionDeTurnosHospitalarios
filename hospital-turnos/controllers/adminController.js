const Profesional = require('../models/profesionalModel');
const Usuario = require('../models/usuarioModel');
const Especialidad = require('../models/especialidadModel');
const Turno = require('../models/turnoModel');
const Paciente = require('../models/pacienteModel');
const Atencion = require('../models/atencionModel');
const { Op } = require('sequelize');
// const { sequelize } = require('../config/database'); // Opcional por si usás transacciones

// 1. MOSTRAR FORMULARIO DE ALTA (GET)
const getAgregarMedico = async (req, res) => {
    try {
        if (!req.session || req.session.id_rol !== 1) {
            return res.redirect('/auth/login');
        }

        // 2. TRAER LAS ESPECIALIDADES REALES DE TU BD
        const especialidades = await Especialidad.findAll({ order: [['nombre', 'ASC']] });

        // 3. PASARLAS A LA VISTA
        res.render('agregarMedico', { 
            especialidades, // <-- Enviamos el array real
            error: undefined, 
            success: undefined 
        });
    } catch (error) {
        console.error('Error al cargar formulario de médicos:', error);
        res.redirect('/dashboard/admin');
    }
};

// 2. PROCESAR EL ALTA EN CASCADA (POST)
const postAgregarMedico = async (req, res) => {
    // 1. Extraemos las variables del formulario (Acá sí existen)
    const { nombre, apellido, id_especialidad, matricula, username, password } = req.body;

    try {
        if (!req.session || req.session.id_rol !== 1) {
            return res.redirect('/auth/login');
        }

        const usuarioExiste = await Usuario.findOne({ where: { nombre_usuario: username } });
        if (usuarioExiste) {
            const especialidades = await Especialidad.findAll({ order: [['nombre', 'ASC']] });
            return res.render('agregarMedico', { 
                especialidades,
                error: 'El nombre de usuario ya está en uso por otro miembro del sistema.',
                success: undefined 
            });
        }

        // Paso A: Crear el Profesional con su FK relacional
        const nuevoProfesional = await Profesional.create({
            nombre,
            apellido,
            id_especialidad, 
            matricula
        });

        // Paso B: Crear su Cuenta de Usuario
        console.log("DATOS QUE LLEGAN AL BACKEND:", req.body);
        await Usuario.create({
            nombre_usuario: username,
            contrasenia: password, 
            id_rol: 2, 
            id_profesional: nuevoProfesional.id_profesional, 
            estado: 'Active'
        });

        // Traemos las especialidades de nuevo para repoblar el select al recargar con éxito
        const especialidades = await Especialidad.findAll({ order: [['nombre', 'ASC']] });

        // EXITO: Acá la variable 'apellido' existe perfectamente porque estamos dentro del mismo ámbito
        return res.render('agregarMedico', { 
            especialidades,
            error: undefined, 
            success: `¡El Dr. ${apellido} fue registrado con éxito!` 
        });

    } catch (error) {
        console.error(' Error crítico al dar de alta al médico:', error);
        
        // REPARACIÓN ACÁ: Traemos las especialidades para que la vista no se rompa al fallar
        const especialidades = await Especialidad.findAll({ order: [['nombre', 'ASC']] });
        
        // CORREGIDO: Eliminamos el uso de 'apellido' que causaba el ReferenceError
        return res.render('agregarMedico', { 
            especialidades,
            error: 'Ocurrió un error interno en la base de datos al guardar el profesional. Verifique los campos obligatorios.', 
            success: undefined 
        });
    }
};

// 1. Vista: Buscar y listar turnos de un médico para reprogramar (GET)
const getReprogramarTurnos = async (req, res) => {
    const { id_profesional } = req.query; // Captura el médico si ya buscó alguno
    const hoy = new Date().toISOString().split('T')[0];
    try {
        if (!req.session || req.session.id_rol !== 1) {
            return res.redirect('/auth/login');
        }

        // Buscamos todos los médicos para el desplegable inicial
        const medicos = await Profesional.findAll({ order: [['apellido', 'ASC']] });

        let turnosDelMedico = [];
        if (id_profesional) {
            // Buscamos los turnos modificables (Reservados o Pendientes) de ese profesional específico
            turnosDelMedico = await Turno.findAll({
where: { 
                    id_profesional: parseInt(id_profesional, 10),
                    estado: 'Reservado',
                    fecha: {
                        [Op.gte]: hoy 
                    }
                },
                include: [{ model: Paciente, as: 'paciente' }],
                order: [['fecha', 'ASC'], ['hora', 'ASC']]
            });
        }

        res.render('verTurnosMedico', {
            medicos,
            turnos: turnosDelMedico,
            id_profesional_seleccionado: id_profesional || '',
            error: undefined,
            exito: undefined
        });

    } catch (error) {
        console.error('Error al cargar pantalla de reprogramación:', error);
        res.redirect('/dashboard/admin');
    }
};

// 2. Acción: Guardar la reprogramación física en MySQL (POST)
const postGuardarReprogramacion = async (req, res) => {
    const { id_turno, nueva_fecha, nueva_hora, id_profesional_redirect } = req.body;

    try {
        if (!req.session || req.session.id_rol !== 1) {
            return res.redirect('/auth/login');
        }

        // UPDATE en MySQL usando Sequelize
        await Turno.update(
            { 
                fecha: nueva_fecha, 
                hora: nueva_hora 
            },
            { where: { id_turno: parseInt(id_turno, 10) } }
        );

        // Volvemos a buscar los datos necesarios para redibujar la pantalla manteniendo al operador en el mismo médico
        const medicos = await Profesional.findAll({ order: [['apellido', 'ASC']] });
        const turnosDelMedico = await Turno.findAll({
            where: { id_profesional: parseInt(id_profesional_redirect, 10), estado: 'Reservado' },
            include: [{ model: Paciente, as: 'paciente' }],
            order: [['fecha', 'ASC'], ['hora', 'ASC']]
        });

        res.render('verTurnosMedico', {
            medicos,
            turnos: turnosDelMedico,
            id_profesional_seleccionado: id_profesional_redirect,
            error: undefined,
            exito: '¡El turno fue reprogramado y guardado físicamente en MySQL con éxito!'
        });

    } catch (error) {
        console.error('Error al guardar la reprogramación del turno:', error);
        res.redirect('/dashboard/admin');
    }
};


// Vista: Panel de Gestión Integral de Pacientes e Historias Clínicas (GET)
const getGestionPacientes = async (req, res) => {
    const { dni_busqueda } = req.query; 

    try {
        if (!req.session || req.session.id_rol !== 1) {
            return res.redirect('/auth/login');
        }

        let filtroWhere = {};
        if (dni_busqueda && dni_busqueda.trim() !== '') {
            filtroWhere.dni = dni_busqueda.trim(); 
        }

        // Buscamos los pacientes aplicando el árbol de joins correcto
        const pacientes = await Paciente.findAll({
            where: filtroWhere,
            include: [{
                model: Turno,
                as: 'turnos',
                include: [
                    { 
                        model: Atencion, 
                        as: 'registro_atencion' // Trae la atención médica si el turno se ejecutó
                    },
                    { 
                        model: Profesional, 
                        as: 'profesional' // Trae los datos del médico que lo atendió
                    }
                ]
            }],
            order: [['apellido', 'ASC']]
        });

        return res.render('gestionPacientes', {
            pacientes: pacientes || [],
            dni_busqueda: dni_busqueda || '',
            error: undefined,
            exito: undefined
        });

    } catch (error) {
        console.error('Error crítico en la gestión integral de pacientes:', error);
        return res.render('gestionPacientes', {
            pacientes: [],
            dni_busqueda: '',
            error: 'Ocurrió un error al consultar las fichas médicas en MySQL.',
            exito: undefined
        });
    }
};

const postCancelarTurnoAdmin = async (req, res) => {
    // Agregamos 'origen' e 'id_medico' para saber a dónde redirigir
    const { id_turno, dni_busqueda, origen, id_medico } = req.body;

    try {
        if (!req.session || req.session.id_rol !== 1) {
            return res.redirect('/auth/login');
        }

        if (!id_turno) {
            return res.redirect('/dashboard/admin');
        }

        // Ejecutamos la cancelación lógica en la base de datos
        await Turno.update(
            { estado: 'Cancelado' },
            { 
                where: { id_turno: parseInt(id_turno, 10) } 
            }
        );

        // CONTROL DE REDIRECCIÓN SEGÚN EL ORIGEN
        if (origen === 'reprogramacion' && id_medico) {
            // Si venía de reprogramación, vuelve al listado de ese médico
            return res.redirect(`/admin/turnos/reprogramar?id_medico=${id_medico}`);
        }

        if (dni_busqueda) {
            // Si venía de la ficha del paciente, mantiene el filtro por DNI
            return res.redirect(`/admin/pacientes/gestion?dni_busqueda=${dni_busqueda}`);
        }
        
        return res.redirect('/admin/pacientes/gestion');

    } catch (error) {
        console.error('Error crítico al cancelar turno:', error);
        return res.redirect('/dashboard/admin');
    }
};

// Acción: Editar los datos filiatorios de un paciente (POST)
const postEditarPacienteAdmin = async (req, res) => {
    const { id_paciente, nombre, apellido, dni, email, telefono, dni_busqueda } = req.body;

    try {
        if (!req.session || req.session.id_rol !== 1) {
            return res.redirect('/auth/login');
        }

        if (!id_paciente) {
            return res.redirect('/admin/pacientes/gestion');
        }

        // Actualizamos de forma segura excluyendo intencionalmente campos médicos
        await Paciente.update(
            { nombre, apellido, dni, email, telefono },
            { where: { id_paciente: parseInt(id_paciente, 10) } }
        );

        // Si había una búsqueda activa, recargamos manteniendo el filtro
        if (dni_busqueda) {
            return res.redirect(`/admin/pacientes/gestion?dni_busqueda=${dni_busqueda}`);
        }
        
        return res.redirect('/admin/pacientes/gestion');

    } catch (error) {
        console.error('Error crítico al editar datos del paciente:', error);
        return res.redirect('/admin/pacientes/gestion');
    }
};

// 1. MODIFICACIÓN: Ajustamos para que lea alertas (error/exito) de la URL tras los redireccionamientos
const getGestionMedicos = async (req, res) => {
    const matricula_busqueda = req.query.matricula_busqueda || '';
    const id_especialidad_busqueda = req.query.id_especialidad_busqueda || '';
    
    // Capturamos posibles mensajes de éxito o error que vengan por la URL
    const errorAlert = req.query.error || undefined;
    const exitoAlert = req.query.exito || undefined;
    
    const limit = 10;
    const page = parseInt(req.query.page, 10) || 1;
    const offset = (page - 1) * limit;

    try {
        if (!req.session || req.session.id_rol !== 1) {
            return res.redirect('/auth/login');
        }

        let filtroWhere = {};
        if (matricula_busqueda.trim() !== '') {
            filtroWhere.matricula = matricula_busqueda.trim();
        }
        if (id_especialidad_busqueda !== '') {
            filtroWhere.id_especialidad = parseInt(id_especialidad_busqueda, 10);
        }

        const { count, rows: medicos } = await Profesional.findAndCountAll({
            where: filtroWhere,
            limit: limit,
            offset: offset,
            order: [['apellido', 'ASC']]
        });

        const especialidades = await Especialidad.findAll({ order: [['nombre', 'ASC']] });
        const totalPages = Math.ceil(count / limit);

        return res.render('gestionMedicos', {
            medicos: medicos || [],
            especialidades: especialidades || [],
            matricula_busqueda,
            id_especialidad_busqueda,
            currentPage: page,
            totalPages: totalPages === 0 ? 1 : totalPages,
            error: errorAlert,  // Inyectamos la alerta de la URL
            exito: exitoAlert   // Inyectamos la alerta de la URL
        });

    } catch (error) {
        console.error('Error crítico al cargar gestión de médicos:', error);
        return res.render('gestionMedicos', {
            medicos: [], especialidades: [], matricula_busqueda: '', id_especialidad_busqueda: '', currentPage: 1, totalPages: 1,
            error: 'Ocurrió un error al consultar la base de datos.',
            exito: undefined
        });
    }
};

// 2. NUEVA ACCIÓN: Eliminar médico de la base de datos de forma segura (POST)
const postEliminarMedicoAdmin = async (req, res) => {
    const { id_profesional, matricula_busqueda, id_especialidad_busqueda, page } = req.body;

    // Armamos la URL de retorno para conservar la página y filtros exactos donde estaba el operador
    let redirectUrl = `/admin/medicos/gestion?page=${page || 1}`;
    if (matricula_busqueda) redirectUrl += `&matricula_busqueda=${matricula_busqueda}`;
    if (id_especialidad_busqueda) redirectUrl += `&id_especialidad_busqueda=${id_especialidad_busqueda}`;

    try {
        if (!req.session || req.session.id_rol !== 1) {
            return res.redirect('/auth/login');
        }

        if (!id_profesional) {
            return res.redirect(redirectUrl);
        }

        // Ejecutamos el DELETE en MySQL
        await Profesional.destroy({
            where: { id_profesional: parseInt(id_profesional, 10) }
        });

        return res.redirect(`${redirectUrl}&exito=El+profesional+médico+ha+sido+eliminado+correctamente.`);

    } catch (error) {
        console.error('Error al intentar eliminar médico:', error);
        
        // Controlamos si la base de datos rechazó el borrado por la restricción de claves foráneas
        if (error.name === 'SequelizeForeignKeyConstraintError') {
            return res.redirect(`${redirectUrl}&error=No+es+posible+eliminar+al+médico+porque+posee+turnos+asociados+en+el+sistema.+Considere+reprogramar+o+cancelar+sus+citas+primero.`);
        }
        
        return res.redirect(`${redirectUrl}&error=Ocurrió+un+error+interno+al+intentar+eliminar+el+registro.`);
    }
};

// 2. Acción: Editar los datos del Médico (POST)
const postEditarMedicoAdmin = async (req, res) => {
    const { id_profesional, nombre, apellido, matricula, id_especialidad, email, telefono, matricula_busqueda, page } = req.body;

    try {
        if (!req.session || req.session.id_rol !== 1) {
            return res.redirect('/auth/login');
        }

        if (!id_profesional) {
            return res.redirect('/admin/medicos/gestion');
        }

        // Actualizamos los datos en MySQL
        await Profesional.update(
            { nombre, apellido, matricula, id_especialidad, email, telefono },
            { where: { id_profesional: parseInt(id_profesional, 10) } }
        );

        // Armamos la URL de retorno para no perder ni el filtro ni la página actual
        let redirectUrl = `/admin/medicos/gestion?page=${page || 1}`;
        if (matricula_busqueda) {
            redirectUrl += `&matricula_busqueda=${matricula_busqueda}`;
        }
        
        return res.redirect(redirectUrl);

    } catch (error) {
        console.error('Error crítico al editar datos del médico:', error);
        return res.redirect('/admin/medicos/gestion');
    }
};

// 1. Vista: Listar Especialidades y formulario de alta (GET)
const getGestionEspecialidades = async (req, res) => {
    const errorAlert = req.query.error || undefined;
    const exitoAlert = req.query.exito || undefined;

    try {
        if (!req.session || req.session.id_rol !== 1) {
            return res.redirect('/auth/login');
        }

        // Traemos todas las especialidades ordenadas alfabéticamente
        const especialidades = await Especialidad.findAll({ order: [['nombre', 'ASC']] });

        return res.render('gestionEspecialidades', {
            especialidades: especialidades || [],
            error: errorAlert,
            exito: exitoAlert
        });

    } catch (error) {
        console.error('Error al cargar especialidades:', error);
        return res.redirect('/dashboard/admin');
    }
};

// 2. Acción: Agregar nueva especialidad (POST)
const postAgregarEspecialidad = async (req, res) => {
    const { nombre, descripcion } = req.body;

    try {
        if (!req.session || req.session.id_rol !== 1) return res.redirect('/auth/login');

        await Especialidad.create({ 
            nombre: nombre.trim(), 
            descripcion: descripcion ? descripcion.trim() : null 
        });

        return res.redirect('/admin/especialidades/gestion?exito=Especialidad+registrada+correctamente.');
    } catch (error) {
        console.error('Error al agregar especialidad:', error);
        if (error.name === 'SequelizeUniqueConstraintError') {
            return res.redirect('/admin/especialidades/gestion?error=Ya+existe+una+especialidad+registrada+con+ese+nombre.');
        }
        return res.redirect('/admin/especialidades/gestion?error=Ocurrió+un+error+al+intentar+guardar+la+especialidad.');
    }
};

// 3. Acción: Editar especialidad existente (POST)
const postEditarEspecialidad = async (req, res) => {
    const { id_especialidad, nombre, descripcion } = req.body;

    try {
        if (!req.session || req.session.id_rol !== 1) return res.redirect('/auth/login');

        await Especialidad.update(
            { 
                nombre: nombre.trim(), 
                descripcion: descripcion ? descripcion.trim() : null 
            },
            { where: { id_especialidad: parseInt(id_especialidad, 10) } }
        );

        return res.redirect('/admin/especialidades/gestion?exito=Especialidad+actualizada+correctamente.');
    } catch (error) {
        console.error('Error al editar especialidad:', error);
        if (error.name === 'SequelizeUniqueConstraintError') {
            return res.redirect('/admin/especialidades/gestion?error=El+nombre+ingresado+ya+está+siendo+utilizado+por+otra+especialidad.');
        }
        return res.redirect('/admin/especialidades/gestion?error=Ocurrió+un+error+al+intentar+actualizar+la+especialidad.');
    }
};

// 4. Acción: Eliminar especialidad (POST)
const postEliminarEspecialidad = async (req, res) => {
    const { id_especialidad } = req.body;

    try {
        if (!req.session || req.session.id_rol !== 1) return res.redirect('/auth/login');

        await Especialidad.destroy({
            where: { id_especialidad: parseInt(id_especialidad, 10) }
        });

        return res.redirect('/admin/especialidades/gestion?exito=Especialidad+eliminada+de+forma+definitiva.');
    } catch (error) {
        console.error('Error al eliminar especialidad:', error);
        if (error.name === 'SequelizeForeignKeyConstraintError') {
            return res.redirect('/admin/especialidades/gestion?error=No+se+puede+eliminar+la+especialidad+porque+existen+médicos+o+consultorios+vinculados+a+ella.');
        }
        return res.redirect('/admin/especialidades/gestion?error=Ocurrió+un+error+interno+al+intentar+eliminar+el+registro.');
    }
};
//Turno.hasOne(Atencion, { as: 'atencion', foreignKey: 'id_turno' });
//Atencion.belongsTo(Turno, { as: 'turno', foreignKey: 'id_turno' });

module.exports = {
    getAgregarMedico,
    postAgregarMedico,
    getReprogramarTurnos,       
    postGuardarReprogramacion,
    getGestionPacientes,
    postCancelarTurnoAdmin,
    postEditarPacienteAdmin,
    getGestionMedicos,
    postEditarMedicoAdmin,
    postEliminarMedicoAdmin,
    postEliminarEspecialidad,
    postEditarEspecialidad,
    postAgregarEspecialidad,
    getGestionEspecialidades
};