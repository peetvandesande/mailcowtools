const mysql = require('mysql');

class DatabaseManager {
  constructor(dburi, password='') {

    console.log(`dburi: ${dburi}`);
    console.log(`password: ${password}`);

    this.pool = this.createPool(dburi, password);
  }

  createPool(dburi, password) {
    console.log('Creating connection pool to the database!');
    const dbParams = this.parseDbUri(dburi);
    console.log('Have dbParams!');

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
      console.log(`MySQL connection established: `, connection.threadId);
      connection.release(err => {if (err) console.error(err.message)});
    })

    return db_pool;
  }

  parseDbUri(dburi) {
    const match = dburi.match(/mysql:\/\/([^:]+)(?::([^@]+))?@([^\/]+)(?::(\d+))?\/(.+)/);
    if (!match) {
      throw new Error('Invalid database URI format');
    }

    return {
      user: match[1],
      password: match[2] || null,
      host: match[3],
      port: match[4] || null,
      database: match[5]
    };
  }

  runQuery = (query) => new Promise((resolve, reject) => {
    console.log(`query: ${query}`);
    this.pool.getConnection((err, connection) => {
      if (err) console.error(err.message);
      connection.query(query, (err, results) => {
        if (err) console.error(err.message);
        resolve(results);
        connection.release(err => { if (err) console.error(err.message) });
      });
    });
  })

  getMailboxes = (domain, active=false) => new Promise((resolve, reject) => {
    const query = `
      SELECT local_part, domain, name, quota, password, password AS password2, active
      FROM mailbox
      WHERE domain = '${domain}'${active ? ' AND active = 1' : ''}
    `;
    resolve(this.runQuery(query));
  });

  getAliases = (domain, active=false) => new Promise((resolve, reject) => {
    const query = `
      SELECT address, goto, active
      FROM alias
      WHERE domain = '${domain}'${active ? ' AND active = 1' : ''}
    `;
    resolve(this.runQuery(query));
  });

  getDomains = (active=false) => new Promise((resolve, reject) => {
    const query = `
      SELECT domain, description, aliases, mailboxes, backupmx, active, 1 as restart_sogo
      FROM domain
      ${active ? 'WHERE active = 1' : ''}
    `;
    resolve(this.runQuery(query));
  });
}

module.exports = DatabaseManager;
