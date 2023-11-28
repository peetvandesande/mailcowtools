const mysql = require('mysql');

class DatabaseManager {
  constructor(dburi, password='', debug=false) {
    this.debug = debug;
    this.pool = this.createPool(dburi, password);
  }

  createPool(dburi, password) {
    const dbParams = this.parseDbUri(dburi);
    if (password=='') password = dbParams.password;

    const db_pool = mysql.createPool({
      host: dbParams.host,
      user: dbParams.user,
      password: password,
      database: dbParams.database,
      port: dbParams.port
    });

    db_pool.getConnection((err, connection) => {
      if (err) console.error(err.message);
      if (this.debug) console.log(`MySQL connection established: `, connection.threadId);
      connection.release(err => {if (err) console.error(err.message)});
    })

    if (this.debug) console.log("Succesfully established MySQL connection pool");
    return db_pool;
  }

  parseDbUri(dburi) {
    const match = dburi.match(/mysql:\/\/([^:]+)(?::([^@]+))?@([^\/]+)(?::(\d+))?\/(.+)/);
    if (!match) {
      throw new Error('Invalid database URI format');
    }

    if (this.debug) console.log(match);

    return {
      user: match[1],
      password: match[2] || null,
      host: match[3],
      port: match[4] || null,
      database: match[5]
    };
  }

  runQuery = (query) => new Promise((resolve, reject) => {
    if (this.debug) console.log(`query: ${query}`);
    this.pool.getConnection((err, connection) => {
      if (err) console.error(err.message);
      connection.query(query, (err, results) => {
        if (err) console.error(err.message);
        resolve(results);
        connection.release(err => { if (err) console.error(err.message) });
      });
    });
  })
}

module.exports = DatabaseManager;
