// mysql.js
const mysql = require('mysql');
const util = require('util');

const configureDb = async (dbUri, password) => {
  const aryUriParts = dbUri.substring(8).split(/([@,\/])/);
  
  const pool = mysql.createPool({
    user: aryUriParts[0],
    host: aryUriParts[2],
    database: aryUriParts[4],
    password: password
  });

  // Promisify query method directly
  pool.queryAsync = util.promisify(pool.query).bind(pool);

  return pool;
}

module.exports = { configureDb };