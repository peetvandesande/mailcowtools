// Written by Peet van de Sande, peet@peetvandesande.com
// MIT License

// Copyright (c) 2023 Peet van de Sande

// Permission is hereby granted, free of charge, to any person obtaining a copy
// of this software and associated documentation files (the "Software"), to deal
// in the Software without restriction, including without limitation the rights
// to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
// copies of the Software, and to permit persons to whom the Software is
// furnished to do so, subject to the following conditions:

// The above copyright notice and this permission notice shall be included in all
// copies or substantial portions of the Software.

// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
// IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
// FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
// AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
// LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
// OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
// SOFTWARE.

const { program } = require('commander');
const axios = require('axios');
const process = require('process');
const version = require('./package').version;
const inquirer = require('inquirer');
//const csvtojsonV2 = require("csvtojson/v2");  // ?
const mysql = require('mysql');
const { log } = require('console');

let axiosInstance = null;
let dbPool = null;

const configureAxios = () => {
  const instance = axios.create({
    baseURL: program.serverurl,
    headers: { 'X-API-Key': program.apikey, 'Content-Type': 'application/json' }
  });
  return instance;
}

const promptPassword = () => {
  const prompt = [
    {
      name: "password",
      type: "input",
      message: "Please enter the DB password:"
    }
  ];
  return inquirer.prompt(prompt);
}

const configureDb = (password) => {
  aryUriParts = program.opts().dburi.substring(8).split(/([@,\/])/);
  const pool = mysql.createPool({
    user: aryUriParts[0],
    host: aryUriParts[2],
    database: aryUriParts[4],
    password: password
  });
  
  pool.getConnection((err, con) =>
  {
    if (con) {
      con.release();
      return pool;
    } else {
      console.error('error: ' + err);
    }
  });
}

const importFile = async (filename) => {
  let importJSON = null;

  try {
    importJSON = await csvtojsonV2({
      noheader: true,
      headers: ['email', 'name', 'password', 'quota']
    }).fromFile(filename);
  } catch (error) {
    console.error(`Error while import:\n${error}`);
    process.exit(-1);
  }
  return importJSON.map(element => {
    const emailParts = element.email.split('@');
    delete element.email;
    return { ...element, local_part: emailParts[0], domain: emailParts[1], active: "1", password2: element.password }
  });
}

const addMailbox = async (mailboxInfo) => {
  try {
    const result = await axiosInstance.post('/api/v1/add/mailbox', mailboxInfo);
    if (result.status !== 200) {
      console.error(`Error while creating mailbox ${mailboxInfo.local_part}@${mailboxInfo.domain}.`);
      if (program.exitonerror) {
        process.exit(3);
      }
    }
    console.log(`Created mailbox ${mailboxInfo.local_part}@${mailboxInfo.domain} with quota ${mailboxInfo.quota} MB`);
  } catch (error) {
    console.error(`Error while adding Mailbox ${mailboxInfo.local_part}@${mailboxInfo.domain}:\n${error}`);
    process.exit(2);
  }
}

const addMailboxes = async (mailboxInfos) => {
  console.log(`Beginning import of ${mailboxInfos.length} mailboxes`);
  mailboxInfos.map(async (mailboxInfo) => {
    await addMailbox(mailboxInfo);
  })
}

const main = async () => {
  program.version(version);
  
  program
    .requiredOption('-d, --dburi <dburi>', 'URI to Postfix Admin : mysql://user@server/dbname')
//    .requiredOption('-s, --serverurl <serverurl>', 'URL of mailcow server : https://mailcow.example.org')
//    .requiredOption('-a, --apikey <apikey>', 'APIKEY for mailcow API')
    .option('-e, --exitonerror', 'exit on first error')
    .option('-p, --password <password>', 'Pass password as argument')
    .parse();

     if (program.opts().password) {
      password = program.opts().password;
    } else {
      const input = await promptPassword();
      password = input.password;
    }
 
    //axiosInstance = configureAxios();
    dbPool = configureDb(password);
  
  //const mailboxInfos = await importFile(program.importfile);
  //await addMailboxes(mailboxInfos);
}

main();


