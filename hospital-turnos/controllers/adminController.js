const Profesional = require('../models/profesionalModel');
const Usuario = require('../models/usuarioModel');
const Especialidad = require('../models/especialidadModel');
const Turno = require('../models/turnoModel');
const Paciente = require('../models/pacienteModel');
const Atencion = require('../models/atencionModel');
const Disponibilidad = require('../models/disponibilidadModel'); 
const { Op } = require('sequelize');

// const { sequelize } = require('../config/database'); // Opcional por si usás transacciones

// 1. MOSTRAR FORMULARIO DE ALTA (GET)
const getAgregarMedico = async (req, res) => {
    try {
        if (!req.session || req.session.id_rol !== 1) return res.redirect('/auth/login');
        
        // Necesitamos las especialidades para el menú desplegable
        const especialidades = await Especialidad.findAll({ order: [['nombre', 'ASC']] });
        
        return res.render('agregarMedico', { 
            especialidades: especialidades || [],
            error: req.query.error, 
            exito: req.query.exito 
        });
    } catch (error) {
        console.error('Error al cargar la vista de agregar médico:', error);
        return res.redirect('/dashboard/admin');
    }
};

// 2. PROCESAR EL ALTA EN CASCADA (POST)
// Procesar el Alta y Generar Agenda Inicial a 2 años (POST)
const postAgregarMedico = async (req, res) => {
    // 1. Agregamos nombre_usuario y contrasenia al destructuring
    const { 
        nombre, apellido, matricula, id_especialidad, email, telefono,
        hora_inicio, hora_fin, dias_trabajo, nombre_usuario, contrasenia 
    } = req.body;

    try {
        if (!req.session || req.session.id_rol !== 1) return res.redirect('/auth/login');

        // 2. Creamos al profesional
        const nuevoMedico = await Profesional.create({
            nombre: nombre.trim(),
            apellido: apellido.trim(),
            matricula: matricula.trim(),
            id_especialidad: parseInt(id_especialidad, 10),
            email: email ? email.trim() : null,
            telefono: telefono ? telefono.trim() : null
        });

        // 3. Creamos el usuario vinculado con las columnas correctas (en texto plano)
        if (nombre_usuario && nombre_usuario.trim() !== '') {
            await Usuario.create({
                nombre_usuario: nombre_usuario.trim(),
                contrasenia: contrasenia && contrasenia.trim() !== '' ? contrasenia : '123456',
                id_profesional: nuevoMedico.id_profesional, // Vinculamos con el ID recién generado
                id_rol: 2 // Rol 2 para médicos
            });
        }

        // 4. Normalizamos los días seleccionados (puede venir un string suelto o un array)
        let diasSeleccionados = [];
        if (dias_trabajo) {
            if (Array.isArray(dias_trabajo)) {
                diasSeleccionados = dias_trabajo.map(d => parseInt(d, 10));
            } else {
                diasSeleccionados = [parseInt(dias_trabajo, 10)];
            }
        }

        // 5. Generamos la agenda a 2 años si se indicaron horarios y días
        if (hora_inicio && hora_fin && diasSeleccionados.length > 0) {
            const slotsNuevos = [];
            
            let diaActual = new Date();
            const diaFin = new Date();
            diaFin.setFullYear(diaFin.getFullYear() + 2); // Proyectamos exactamente 2 años

            while (diaActual <= diaFin) {
                // En JavaScript: 0=Domingo, 1=Lunes, 2=Martes, etc.
                // Verificamos si el día de la semana actual está entre los seleccionados
                if (diasSeleccionados.includes(diaActual.getDay())) {
                    let fechaSql = diaActual.toISOString().split('T')[0];
                    
                    let hrActual = new Date(`2000-01-01T${hora_inicio}:00`);
                    let hrFin = new Date(`2000-01-01T${hora_fin}:00`);

                    while (hrActual < hrFin) {
                        let horaTexto = hrActual.getHours().toString().padStart(2, '0') + ':' + 
                                        hrActual.getMinutes().toString().padStart(2, '0') + ':00';
                        
                        slotsNuevos.push({
                            id_profesional: nuevoMedico.id_profesional,
                            fecha: fechaSql,
                            hora: horaTexto
                        });
                        
                        hrActual.setMinutes(hrActual.getMinutes() + 15);
                    }
                }
                diaActual.setDate(diaActual.getDate() + 1);
            }

            // Guardamos los miles de registros de golpe en MySQL
            if (slotsNuevos.length > 0) {
                await Disponibilidad.bulkCreate(slotsNuevos);
            }
        }

        return res.redirect('/admin/medicos/gestion?exito=Profesional,+usuario+y+agenda+creados+correctamente.');

    } catch (error) {
        console.error('Error al registrar médico:', error);
        if (error.name === 'SequelizeUniqueConstraintError') {
            return res.redirect('/admin/medicos/agregar?error=La+matrícula+o+el+nombre+de+usuario+ya+se+encuentra+registrado.');
        }
        return res.redirect('/admin/medicos/agregar?error=Ocurrió+un+error+interno+al+guardar+los+datos.');
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
    const { id_turno, id_profesional_redirect, nueva_fecha, nueva_hora } = req.body;

    try {
        if (!req.session || req.session.id_rol !== 1) return res.redirect('/auth/login');

        // 1. VALIDACIÓN: ¿Ese horario existe en la tabla de Disponibilidad del médico?
        const esDisponible = await Disponibilidad.findOne({
            where: { id_profesional: id_profesional_redirect, fecha: nueva_fecha, hora: nueva_hora }
        });

        if (!esDisponible) {
            return res.redirect('/admin/turnos/reprogramar?error=El+médico+no+tiene+disponibilidad+en+ese+horario.');
        }

        // 2. VALIDACIÓN: ¿Está ocupado por otro turno? (Evitar superposición RF-12)
        const ocupado = await Turno.findOne({
            where: { 
                id_profesional: id_profesional_redirect, 
                fecha: nueva_fecha, 
                hora: nueva_hora,
                estado: 'Reservado',
                id_turno: { [Op.ne]: id_turno } // Que no sea el turno que ya estamos editando
            }
        });

        if (ocupado) {
            return res.redirect('/admin/turnos/reprogramar?error=Ese+horario+ya+fue+asignado+a+otro+paciente.');
        }

        // 3. Si pasó las dos validaciones, actualizamos
        await Turno.update(
            { fecha: nueva_fecha, hora: nueva_hora },
            { where: { id_turno: parseInt(id_turno, 10) } }
        );

        return res.redirect(`/admin/turnos/reprogramar?id_profesional=${id_profesional_redirect}&exito=Turno+reprogramado+exitosamente.`);

    } catch (error) {
        console.error('Error al guardar la reprogramación:', error);
        return res.redirect('/admin/turnos/reprogramar?error=Error+al+procesar+la+reprogramación.');
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
            order: [['apellido', 'ASC']],
            include: [{ 
                model: Usuario, 
                as: 'Usuario' // Debe coincidir con el 'as' que pusimos en el modelo
            }]
        });

        const especialidades = await Especialidad.findAll({ order: [['nombre', 'ASC']] });
        const totalPages = Math.ceil(count / limit);
        
        const hoyStr = new Date().toISOString().split('T')[0];
        
        for (let med of medicos) {
            const slots = await Disponibilidad.findAll({
                where: { 
                    id_profesional: med.id_profesional,
                    fecha: { [Op.gte]: hoyStr } // Desde hoy en adelante
                },
                limit: 150 // Tomamos una muestra representativa de turnos futuros
            });

            if (slots.length > 0) {
                // 1. Extraemos los días de la semana y los traducimos
                const diasNumeros = [...new Set(slots.map(s => new Date(s.fecha + 'T12:00:00').getDay()))];
                diasNumeros.sort((a, b) => a - b);
                const mapaDias = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
                const diasTexto = diasNumeros.map(d => mapaDias[d]).join(', ');

                // 2. Extraemos la hora mínima de entrada y máxima de salida
                const horas = slots.map(s => s.hora);
                const horaMin = horas.reduce((min, h) => h < min ? h : min).substring(0, 5);
                const horaMax = horas.reduce((max, h) => h > max ? h : max).substring(0, 5);

                // 3. Lo guardamos dinámicamente en el objeto del médico
                med.agendaResumen = `${diasTexto} | de ${horaMin} a ${horaMax} hs`;
            } else {
                med.agendaResumen = 'Sin agenda cargada';
            }
        }

return res.render('gestionMedicos', {
            medicos: medicos || [],
            especialidades: especialidades || [],
            matricula_busqueda,
            id_especialidad_busqueda,
            currentPage: page,
            totalPages: totalPages === 0 ? 1 : totalPages,
            error: errorAlert,
            exito: exitoAlert
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
    const { id_profesional, nombre, apellido, matricula, id_especialidad, email, telefono, username, password, matricula_busqueda, page } = req.body;

    try {
        // 1. Actualizamos datos básicos del profesional
        await Profesional.update({
            nombre, apellido, matricula, id_especialidad, email, telefono
        }, { where: { id_profesional } });

        // 2. Lógica para el Usuario vinculado con las columnas correctas
        if (username && username.trim() !== '') {
            // Buscamos si ya tiene usuario, si no, lo creamos
            let usuario = await Usuario.findOne({ where: { id_profesional: id_profesional } });
            
            if (!usuario) {
                // Crear usuario nuevo si no existe utilizando nombre_usuario y contrasenia
                await Usuario.create({
                    nombre_usuario: username.trim(),
                    contrasenia: password && password.trim() !== '' ? password : '123456', // Contraseña por defecto si viene vacía
                    id_profesional: id_profesional,
                    id_rol: 2 // Rol de médico
                });
            } else {
                // Actualizar usuario existente
                let updateData = { nombre_usuario: username.trim() };
                
                if (password && password.trim() !== '') {
                    updateData.contrasenia = password;
                }
                await usuario.update(updateData);
            }
        }

        return res.redirect(`/admin/medicos/gestion?page=${page || 1}&matricula_busqueda=${matricula_busqueda || ''}&exito=Profesional+actualizado.`);
        
    } catch (error) {
        console.error('Error al editar:', error);
        return res.redirect('/admin/medicos/gestion?error=Error+al+guardar+datos.');
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

// 1. Vista: Seleccionar médico y ver su agenda disponible (GET)
const getGestionDisponibilidad = async (req, res) => {
    const id_profesional = req.query.id_profesional;
    const errorAlert = req.query.error;
    const exitoAlert = req.query.exito;

    try {
        if (!req.session || req.session.id_rol !== 1) return res.redirect('/auth/login');

        // Traemos a todos los médicos para el select principal
        const medicos = await Profesional.findAll({ order: [['apellido', 'ASC']] });
        
        let disponibilidades = [];
        let medicoSeleccionado = null;

        if (id_profesional) {
            medicoSeleccionado = await Profesional.findByPk(id_profesional);
            
            // Traemos solo la disponibilidad desde el día de hoy en adelante
            const hoy = new Date().toISOString().split('T')[0];
            disponibilidades = await Disponibilidad.findAll({
                where: { 
                    id_profesional: id_profesional,
                    fecha: { [Op.gte]: hoy } 
                },
                order: [['fecha', 'ASC'], ['hora', 'ASC']]
            });
        }

        return res.render('gestionDisponibilidad', {
            medicos: medicos || [],
            disponibilidades: disponibilidades || [],
            medicoSeleccionado,
            id_profesional_seleccionado: id_profesional || '',
            error: errorAlert,
            exito: exitoAlert
        });

    } catch (error) {
        console.error('Error al cargar la disponibilidad:', error);
        return res.redirect('/dashboard/admin');
    }
};

// 2. Acción: Generar los bloques de 15 minutos en lote (POST)
const postGenerarDisponibilidad = async (req, res) => {
    const { id_profesional, fecha, hora_inicio, hora_fin } = req.body;

    try {
        if (!req.session || req.session.id_rol !== 1) return res.redirect('/auth/login');

        if (!id_profesional || !fecha || !hora_inicio || !hora_fin) {
            return res.redirect('/admin/disponibilidad/gestion?error=Faltan+datos+para+generar+la+agenda.');
        }

        // Parseamos las horas para armar el bucle iterativo
        let actual = new Date(`2000-01-01T${hora_inicio}:00`);
        let fin = new Date(`2000-01-01T${hora_fin}:00`);
        const slotsNuevos = [];

        // Generamos bloques de 15 minutos hasta llegar a la hora de fin
        while (actual < fin) {
            // Formateamos la hora en texto "HH:MM:SS" seguro
            let horaTexto = actual.getHours().toString().padStart(2, '0') + ':' + 
                            actual.getMinutes().toString().padStart(2, '0') + ':00';
            
            // Verificamos que el médico no tenga ya este mismo bloque cargado para no duplicar
            const existe = await Disponibilidad.findOne({
                where: { id_profesional, fecha, hora: horaTexto }
            });

            if (!existe) {
                slotsNuevos.push({
                    id_profesional: parseInt(id_profesional, 10),
                    fecha: fecha,
                    hora: horaTexto
                });
            }
            
            // Sumamos 15 minutos exactos para el próximo ciclo
            actual.setMinutes(actual.getMinutes() + 15);
        }

        // Si hay bloques nuevos, los guardamos todos de golpe en MySQL (Bulk Insert)
        if (slotsNuevos.length > 0) {
            await Disponibilidad.bulkCreate(slotsNuevos);
            return res.redirect(`/admin/disponibilidad/gestion?id_profesional=${id_profesional}&exito=Se+generaron+${slotsNuevos.length}+horarios+nuevos+con+éxito.`);
        } else {
            return res.redirect(`/admin/disponibilidad/gestion?id_profesional=${id_profesional}&error=Todos+los+horarios+en+ese+rango+ya+estaban+creados.`);
        }

    } catch (error) {
        console.error('Error al generar disponibilidad:', error);
        return res.redirect(`/admin/disponibilidad/gestion?id_profesional=${id_profesional}&error=Ocurrió+un+error+al+guardar+los+horarios.`);
    }
};

// 3. Acción: Eliminar un bloque de horario que ya no sirve (POST)
const postEliminarDisponibilidad = async (req, res) => {
    const { id_disponibilidad, id_profesional } = req.body;

    try {
        if (!req.session || req.session.id_rol !== 1) return res.redirect('/auth/login');

        await Disponibilidad.destroy({
            where: { id_disponibilidad: parseInt(id_disponibilidad, 10) }
        });

        return res.redirect(`/admin/disponibilidad/gestion?id_profesional=${id_profesional}&exito=El+horario+fue+removido+de+la+agenda.`);
    } catch (error) {
        console.error('Error al eliminar disponibilidad:', error);
        return res.redirect(`/admin/disponibilidad/gestion?id_profesional=${id_profesional}&error=Ocurrió+un+error+al+intentar+eliminar+el+registro.`);
    }
};

// Acción: Regenerar la agenda del médico desde el panel de Staff (POST)
const postRegenerarAgendaMedico = async (req, res) => {
    const { id_profesional, hora_inicio, hora_fin, dias_trabajo, matricula_busqueda, page } = req.body;

    // Mantenemos la memoria de la paginación y la búsqueda
    let redirectUrl = `/admin/medicos/gestion?page=${page || 1}`;
    if (matricula_busqueda) redirectUrl += `&matricula_busqueda=${matricula_busqueda}`;

    try {
        if (!req.session || req.session.id_rol !== 1) return res.redirect('/auth/login');

        // 1. Normalizamos los días seleccionados (checkboxes)
        let diasSeleccionados = [];
        if (dias_trabajo) {
            if (Array.isArray(dias_trabajo)) diasSeleccionados = dias_trabajo.map(d => parseInt(d, 10));
            else diasSeleccionados = [parseInt(dias_trabajo, 10)];
        }

        if (!hora_inicio || !hora_fin || diasSeleccionados.length === 0) {
            return res.redirect(`${redirectUrl}&error=Faltan+datos+para+generar+la+agenda.`);
        }

        // 2. Eliminamos la disponibilidad futura para no duplicar horarios
        const hoy = new Date().toISOString().split('T')[0];
        await Disponibilidad.destroy({
            where: {
                id_profesional: parseInt(id_profesional, 10),
                fecha: { [Op.gte]: hoy } // Desde hoy en adelante
            }
        });

        // 3. Generamos los nuevos slots por los próximos 2 años
        const slotsNuevos = [];
        let diaActual = new Date();
        const diaFin = new Date();
        diaFin.setFullYear(diaFin.getFullYear() + 2);

        while (diaActual <= diaFin) {
            if (diasSeleccionados.includes(diaActual.getDay())) {
                let fechaSql = diaActual.toISOString().split('T')[0];
                let hrActual = new Date(`2000-01-01T${hora_inicio}:00`);
                let hrFin = new Date(`2000-01-01T${hora_fin}:00`);

                while (hrActual < hrFin) {
                    let horaTexto = hrActual.getHours().toString().padStart(2, '0') + ':' +
                                    hrActual.getMinutes().toString().padStart(2, '0') + ':00';

                    slotsNuevos.push({
                        id_profesional: parseInt(id_profesional, 10),
                        fecha: fechaSql,
                        hora: horaTexto
                    });

                    hrActual.setMinutes(hrActual.getMinutes() + 15);
                }
            }
            diaActual.setDate(diaActual.getDate() + 1);
        }

        if (slotsNuevos.length > 0) {
            await Disponibilidad.bulkCreate(slotsNuevos);
        }

        return res.redirect(`${redirectUrl}&exito=Agenda+regenerada+exitosamente+por+los+próximos+2+años.`);
    } catch (error) {
        console.error('Error al regenerar agenda:', error);
        return res.redirect(`${redirectUrl}&error=Ocurrió+un+error+al+intentar+regenerar+la+agenda.`);
    }
};

const getFechasDisponiblesAPI = async (req, res) => {
    const { id_profesional } = req.query;
    if (!id_profesional) return res.json([]);

    try {
        const hoy = new Date().toISOString().split('T')[0]; // "YYYY-MM-DD"
        
        // Buscamos todas las fechas únicas generadas para este médico
        const fechas = await Disponibilidad.findAll({
            attributes: ['fecha'],
            where: { 
                id_profesional: id_profesional,
                fecha: { [Op.gte]: hoy } // Mayor o igual a hoy
            },
            group: ['fecha'], // Agrupa para no traer la misma fecha 20 veces
            order: [['fecha', 'ASC']]
        });

        // Devolvemos un array limpio solo con los textos de las fechas
        return res.json(fechas.map(f => f.fecha));
    } catch (error) {
        console.error('Error en API de fechas:', error);
        return res.status(500).json([]);
    }
};

// API 2: Obtener las horas libres de un médico en una fecha específica
const getHorasDisponiblesAPI = async (req, res) => {
    const { id_profesional, fecha } = req.query;
    if (!id_profesional || !fecha) return res.json([]);

    try {
        const hoy = new Date().toISOString().split('T')[0];
        const ahora = new Date().toTimeString().split(' ')[0]; // "HH:MM:SS"

        // 1. Traemos TODOS los bloques de la agenda del médico para ese día
        let whereAgenda = { id_profesional, fecha };
        
        // Si el día elegido es HOY, filtramos para que solo traiga horas que todavía no pasaron
        if (fecha === hoy) {
            whereAgenda.hora = { [Op.gt]: ahora };
        }

        const bloquesAgenda = await Disponibilidad.findAll({
            where: whereAgenda,
            order: [['hora', 'ASC']]
        });

        // 2. Traemos los turnos que YA ESTÁN RESERVADOS para ese día
        const turnosOcupados = await Turno.findAll({
            where: { id_profesional, fecha, estado: 'Reservado' }
        });
        const horasOcupadas = turnosOcupados.map(t => t.hora);

        // 3. Cruzamos los datos: filtramos los bloques que no estén en la lista de ocupados
        const horasLibres = bloquesAgenda
            .filter(b => !horasOcupadas.includes(b.hora))
            .map(b => b.hora);

        return res.json(horasLibres);
    } catch (error) {
        console.error('Error en API de horas:', error);
        return res.status(500).json([]);
    }
};



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
    getGestionEspecialidades,
    getGestionDisponibilidad,
    postGenerarDisponibilidad,
    postEliminarDisponibilidad,
    postRegenerarAgendaMedico,
    getFechasDisponiblesAPI,
    getHorasDisponiblesAPI,
};