const { Router } = require('express');
const router = Router();
const jwt = require('jsonwebtoken');
const {firma} = require('../seguridad/config-seguridad');
const {checkToken, authRole} = require('../funciones');//Funciones propias
const asyncHandler = require('express-async-handler');
const Sequelize = require('sequelize');//Configuracion Base de datos
const sequelize = require('../data/db-conexion');
const {crearTablas, modelos, roles} = require("../data/db");
const {Producto, Usuario, Pedido, Pedidos_Producto} = modelos;


crearTablas().then(_=>{
  console.log("Tablas Creadas");
});



//Rutas

//Bienvenida
router.get('/', (req, res) => res.send('Delilah Restó App'));


//Login

router.post('/login', (req, res) => {

  let {nombreUsuario, password} = req.body;
  sequelize.authenticate().then(async () => {
    let {nombreUsuario, password} = req.body;
    const query = `SELECT id,nombre,nombreUsuario,password,rol FROM Delilah_Resto.usuarios WHERE nombreUsuario = ${JSON.stringify(nombreUsuario)} AND password = ${JSON.stringify(password)};`;
    const [resultados] =  await sequelize.query(query, { raw: true })
    console.log(resultados);
    if (resultados.length > 0) {
      const token = jwt.sign({id: resultados[0].id, nombre: resultados[0].nombre, nombreUsuario: resultados[0].nombreUsuario, password: password, rol: resultados[0].rol}, firma);
      res.statusCode = 200;
      res.json(token);
      // console.log(token)
      // console.log("Linea 133: ", resultados[0].id);
      // console.log("Linea 134: ", resultados[0].nombre);
      // console.log("Linea 135: ", resultados[0].nombreUsuario);
      // console.log("Linea 136: ", resultados[0].password);
      // console.log("Linea 137: ", resultados[0].rol);
      return
    } else {
      res.statusCode = 400;
      res.json({ error: "Usuario o contraseña incorrecta."});
      return
    }
  })
});


//Metodo Seguro

router.post('/seguro', (req,res) => {
res.send(`Esta es una página autenticada. Hola ${req.usuario.nombre}. Tu rol es ${req.usuario.rol}`)
});


//-------------------------Usuarios---------------------------------------------------

//Post, opcion para CREAR una nueva cuenta USUARIO, valída en bd si ya existe el nombreUsuario si no, se crea por defecto con rol de usuarioBasico.

router.post('/usuarios', function(req, res) {

  sequelize.authenticate().then(async () => {
      
    const query = `SELECT nombreUsuario FROM usuarios WHERE nombreUsuario = ${JSON.stringify(req.body.nombreUsuario)}` 
    const [resultados] = await sequelize.query(query, { raw: true });

    console.log(resultados);

    if(resultados.length > 0 ){
      res.statusCode = 400;
      res.send('El usuario ya existe en la base de datos');
    } else {
      Usuario.create({ nombre: req.body.nombre, apellido: req.body.apellido, email: req.body.email, telefono: req.body.telefono , direccioEnvio: req.body.direccioEnvio, nombreUsuario: req.body.nombreUsuario, password: req.body.password, rol: roles.BASIC }).then(function(nombre) {
        res.statusCode = 201;
        res.json(nombre);
        console.log("Usuario creado")
      });
    }
  
  })
  .catch(err => {
    res.statusCode = 500;
    console.error('Unable to connect to the database:', err);
  });

  
});

//Get Usuarios 

router.get('/usuarios', authRole(roles.ADMIN), (req, res) => {
  
  sequelize.authenticate().then(async () => {
        
    const query = 'SELECT * FROM usuarios';
    const [resultados] =  await sequelize.query(query, { raw: true })
    console.log(resultados);
    res.statusCode = 200;
    res.json(resultados);
        
  })
  .catch(err => {
    res.statusCode = 500;
    console.error('Unable to connect to the database:', err);
  });

});



//Get USUARIO por id

router.get('/usuarios/:indiceUsuarios', (req, res) => {
 
  sequelize.authenticate().then(async () => {
    
    const indiceUsuarios = req.params.indiceUsuarios;
    const verificarToken = checkToken(req.headers.authorization);
    const query = `SELECT * FROM usuarios WHERE id = ${indiceUsuarios}`;
    const [resultados] = await sequelize.query(query, { raw: true });

    console.log("Rol", verificarToken.rol === roles.ADMIN);
    console.log(indiceUsuarios === verificarToken.toString());


    if(indiceUsuarios === verificarToken.id.toString() || verificarToken.rol === roles.ADMIN){
      console.log("estoy validando")
      res.statusCode = 200;
      res.json(resultados);
    } else {
      res.statusCode = 401;
      res.send('No es permitido el acceso a este recurso.');
    }
  
  })
  .catch(err => {
    res.statusCode = 500;
    console.error('Unable to connect to the database:', err);
  });

});



//Put, actualizar USUARIO por id

router.put('/usuarios/:indiceUsuario', function(req, res) {

  const indiceUsuario = req.params.indiceUsuario;
  Usuario.findByPk(req.params.indiceUsuario).then(function(nombre) {
    nombre.update({
      nombre: req.body.nombre,
      apellido: req.body.apellido,
      email: req.body.email,
      telefono: req.body.telefono,
      direccioEnvio: req.body.direccioEnvio,
      nombreUsuario: req.body.nombreUsuario,
      password: req.body.password,
      rol: roles.BASIC
  }).then((nombre) => {
    
    //Validacion de usuario autorizado
    if(req.usuario.id.toString() === indiceUsuario.toString() || req.usuario.rol === roles.ADMIN ){
      return res.status(200).json(nombre);
    } else {
      res.statusCode = 401;
      res.send('No es permitido el acceso a este recurso.')
    }
      
    });
  });
});



//Delete, borrar USUARIO por id

router.delete('/usuarios/:indiceUsuario', authRole(roles.ADMIN), function(req, res) {
  try {
    const indiceUsuario = req.params.indiceUsuario;
    Usuario.findByPk(req.params.indiceUsuario).then(function(nombre) {
    nombre.destroy();
  }).then((nombre) => {
    res.sendStatus(204);
  });  
  } catch (error) {
    res.statusCode = 400;
    res.send('No fue encontrado el usuario en bd.');
  }
  
});

//-------------------------Productos---------------------------------------------------

//Get Productos, puede listar todos los productos disponibles.

router.get('/productos', (req, res) => {

  sequelize.authenticate().then(async () => {

    const query = 'SELECT * FROM productos';
    const [resultados] =  await sequelize.query(query, { raw: true })
    console.log(resultados);
    res.statusCode = 200;
    res.json(resultados);    

  })
  .catch(err => {
    res.statusCode = 500;
    console.error('Unable to connect to the database:', err);
  });

});


//Get productos por id

router.get('/productos/:indiceProductos', (req, res) => {
 
  sequelize.authenticate().then(async () => {
    
    const indiceProductos = req.params.indiceProductos;
    const query = `SELECT * FROM productos WHERE id = ${indiceProductos}`;
    const [resultados] =  await sequelize.query(query, { raw: true })
    console.log(resultados);
    
    if (resultados.length > 0) {
      res.statusCode = 200;
      res.json(resultados);

    } else {
      res.statusCode = 404;
      res.json({ error: "El producto no existe"})
    }

  })
  .catch(err => {
    res.statusCode = 500;
    console.error('Unable to connect to the database:', err);
  });

});


//Post, crear productos. Debe enviarse por formulario

router.post('/productos', authRole(roles.ADMIN),function(req, res) {
  console.log(req.file)
  try {
    Producto.create({ nombreProducto: req.body.nombreProducto, imagen: req.file.path, precio: req.body.precio }).then(function(nombre) {
    res.statusCode = 201;
    res.json(nombre);
    });  
  } catch (error) {
    res.statusCode = 500;
    console.error('Unable to connect to the database:', err);
  }
  
});

//Put, actualizar producto por id

router.put('/productos/:indiceProductos', authRole(roles.ADMIN), function(req, res) {
  try {
    const indiceProductos = req.params.indiceProductos;
    Producto.findByPk(req.params.indiceProductos).then(function(actualizacionProducto) {
      actualizacionProducto.update({
        nombreProducto: req.body.nombre,
        imagen: req.body.imagen,
        precio: req.body.precio
    }).then((actualizacionProducto) => {
      res.statusCode = 200;
      res.json(actualizacionProducto);
    });
  });  
  } catch (error) {
    res.statusCode = 500;
    console.error('Unable to connect to the database:', error);
  }
  
});

//Delete, borrar producto por id

router.delete('/productos/:indiceProductos', authRole(roles.ADMIN), function(req, res) {
  
  try {
    const indiceProductos = req.params.indiceProductos;
    Producto.findByPk(req.params.indiceProductos).then(function(borrarProducto) {
      borrarProducto.destroy();
    }).then((borrarProducto) => {
      res.sendStatus(204);
    });  
  } catch (error) {
    res.statusCode = 500;
    console.error('Unable to connect to the database:', error);
  }
  
  
});

//-------------------------------------PEDIDOS---------------------------------------------------------------------------

//Crear pedido
router.post('/pedidos', asyncHandler (async(req, res) => {
  
  //Buscar el usuario con el Id que dieron y asegurarme si existe. Si no, responder con error.
  const usuarioId = await Usuario.findByPk(req.body.usuarioId);
  
  if(!usuarioId) {
    res.statusCode = 404;
    res.json({ error: "El usuario no existe"})
  } else {

    try {
    
      //Crear y guardar el pedido
      const guardarPedido = await Pedido.create (req.body, {w:1}, { returning: true});
      
      //Recorro todos los productos en req.productos
      req.body.productos.forEach(async(item) => {
      
        //Buscar el producto con el Id que dieron y asegurarme si existe. Si no, responder con status 400.
        const producto = await Producto.findByPk(item.id);
        if(!producto) throw new Error("Este producto no existe");
        
        //Creo un diccionario con el cual crear el Pedidos_Producto
        const pedidoProducto = {
          pedidoId: guardarPedido.id,
          productoId: item.id,
          cantidad: item.cantidad
        }
  
        //Crear y guardar un pedidoProducto
        guardarPedidoProducto = await Pedidos_Producto.create(pedidoProducto, { w:1 }, {returning:true});
        if(!guardarPedidoProducto) throw new Error("No se pudo guardar en la tabla de pedidos_producto");
  
      });
     
      if (!guardarPedido) throw new Error(`No fue posible guardar el producto ${item.id} en el pedido ${pedidoProducto.pedidoId}`);

      return res.status(201).json(guardarPedido);
 
    } catch (e) { 
      res.statusCode = 404;
      res.json({ error: "El pedido no pudo ser creado"})
      console.log(e); 
    }
  }

}));


//Get obtenemos toda la informacion de Pedidos y productos. Solo para el usuario Administrador.
router.get('/pedidos', authRole(roles.ADMIN), asyncHandler (async (req, res) => {
  try {
    //Obtener todos los pedidos
    const todoPedidos = await Pedido.findAll({
    
    //Asegurarse de incluir los productos
    include: [{
      model: Producto,
      as: 'productos',
      required: false,
      //Pasar los atributos del producto que deseo traer
      attributes: [  'id', 'nombreProducto','imagen', 'precio' ],
      through: {
        //El codigo a continuacion, trae las propiedades de la tabla de union
        model: Pedidos_Producto,
        as: 'pedidos_producto',
        attributes: ['cantidad']
      }
    }]
  });

   //Si todo esta bien
   return res.status(200).json(todoPedidos);  
  } catch (error) {
    res.statusCode = 500;
    res.json({ error: "No se puede conectar con la base de datos"})
  }
  
}));


//Get obtenemos pedidos por id, solo para usuario Basico
router.get('/pedidos/:indicePedidos', asyncHandler (async (req, res) => {

  //Obtener el pedido
  const pedidoPorId = await Pedido.findByPk((req.params.indicePedidos), {
        
      //Asegurarse de incluir los productos
      include: [{
        model: Producto,
        as: 'productos',
        required: true,
        //Pasar los atributos del producto que deseo traer
        attributes: [  'id', 'nombreProducto','imagen', 'precio' ],
        through: {
          //El codigo a continuacion, trae las propiedades de la tabla de union
          model: Pedidos_Producto,
          as: 'pedidos_producto',
          attributes: ['cantidad']
        }
      }]
  });

  //Validacion de usuario autorizado
  
  if (req.usuario.id.toString() === pedidoPorId.dataValues.usuarioId.toString() || req.usuario.rol === roles.ADMIN){
        
      console.log("estoy validando")
      return res.status(200).json(pedidoPorId);
  
  }  else {
    res.statusCode = 401;
    res.send('No es permitido el acceso a este recurso.')
  }
  
}));



//Actualizar / Editar pedidos.
router.patch('/pedidos/:indicePedido', authRole(roles.ADMIN), asyncHandler (async (req, res) => {

  //Validamos si el valor enviado para modificar el  estado del pedido, se encuentra entre los valores permitidos.
  if (req.body.estado === "nuevo" || req.body.estado === "confirmado" || req.body.estado === "preparando" || req.body.estado === "enviando" || req.body.estado === "cancelado" || req.body.estado === "entregado" ) {
    
    // Obtenemos el pedido de la BD
    const pedido = await Pedido.findByPk(req.params.indicePedido);
    
    if (!pedido) {     
      res.statusCode = 404;
      res.json({ error: "El pedido no existe"});
    }

    pedido.update({
      fecha: req.body.fecha,
      tipo_pago: req.body.tipo_pago,
      estado: req.body.estado,
      usuarioId: req.body.usuarioId
    });
    

    // Quitamos las asociaciones de pedidos y productos
    const productos = await pedido.getProductos();
    console.log("PRODUCTOS", productos)
    
    pedido.removeProductos(productos);
    console.log("PEDIDO DESPUES DE REMOVER PRODCTOS", productos, pedido)

    // Recorremos el arreglo del request para modificar pedidos_producto
    req.body.productos.forEach(async (item) => {
      console.log(item.pedidos_producto.cantidad);
        
      // Creamos un diccionario para crear pedidos_producto 
      const pp = {
        pedidoId: pedido.id,
        productoId: item.id,
        cantidad: item.pedidos_producto.cantidad
      };

      // Crear y guardar pedidos_producto
      const guardarPedidoProducto = await Pedidos_Producto.create(pp, { w: 1 }, { returning: true });
      console.log("guardarPedidoProduccto",guardarPedidoProducto);
    });

    console.log("sali del foreach");
    
    return res.status(200).json(pedido);

  } else {
    res.status(400).send({ error: 'Algo ha fallado, la propiedad estado del pedido, solo puede contener una de los siguientes valores: nuevo, confirmado, preparando, enviando, cancelado, entregado' });
  }

}));



//Delete Pedido por id
router.delete('/pedidos/:indicePedidos', authRole(roles.ADMIN), function(req, res) {
  try {
    const indicePedidos = req.params.indicePedidos;
    Pedido.findByPk(req.params.indicePedidos).then(function(borrarPedido) {
      borrarPedido.destroy();
    }).then((borrarPedido) => {
      res.sendStatus(204);
    });  
  } catch (error) {
    res.statusCode = 500;
    console.error('Unable to connect to the database:', err);
  }
  
});

module.exports = router;