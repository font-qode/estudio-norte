/* global require, module */

const { Pool } = require("pg");

// Administra las conexiones con PostgreSQL.
// Obtiene usuario, contraseña y base desde las variables del .env.
const pool = new Pool();

// Permite usar pool desde server.js.
module.exports = pool;