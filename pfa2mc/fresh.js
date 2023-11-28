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

const program = require('commander');
const inquirer = require('inquirer');
const DatabaseManager = require('./databaseManager');

let dbInstance = null;

const promptPassword = async () => {
  const prompt = [
    {
      name: "password",
      type: "input",
      message: "Please enter the DB password:"
    }
  ];
  const input = await inquirer.prompt(prompt);
  return input.password;
}

function showHelpandExit() {
    program.help();
    process.exit(0);
}

function getDomainInfo(activeonly=false) {
  const query = `
  SELECT domain, description, aliases, mailboxes, backupmx, active, 1 as restart_sogo
  FROM domain
  ${activeonly ? 'WHERE active = 1' : ''}
  `;
  return dbInstance.runQuery(query);
}

function getMailboxInfo(domain, activeonly=false) {
  const query = `
  SELECT local_part, domain, name, quota, password, password AS password2, active
  FROM mailbox
  WHERE domain = '${domain}'
  ${activeonly ? ' AND active = 1' : ''}
  `;
  return dbInstance.runQuery(query);
}

function getAliasInfo(domain, activeonly=false) {
  const query = `
  SELECT address, goto, active
  FROM alias
  WHERE domain = '${domain}'
  ${activeonly ? ' AND active = 1' : ''}
  `;
  return dbInstance.runQuery(query);
}

const main = async () => {
    program.version(require('./package').version);
  
    program
      .option('--activeonly', 'Only import active mailboxes')
      .option('-d, --dburi <dburi>', 'URI to Postfix Admin: mysql://user@server/dbname')
      .option('-e, --exitonerror', 'Exit on first error')
      .option('-h, --help', 'Display help text')
      .option('-n, --domainname <domainname>', 'Domain for which to migrate mailboxes')
      .option('-p, --password <password>', 'Pass password as argument')
      .option('-pp', 'Prompt for password')
      .parse();

      console.log(program.opts());
  

    try {
      if(program.opts().help || !program.opts().dburi) {
          showHelpandExit();
      }
      
      dbInstance = new DatabaseManager(program.opts().dburi, program.opts().Pp ? await promptPassword() : program.opts().password, false);
      
      const DomainInfo = await getDomainInfo(program.opts().activeonly);
      console.log(DomainInfo);

      const MailboxInfo = await getMailboxInfo(program.opts().domainname, program.opts().activeonly);
      console.log(MailboxInfo);

      const AliasInfo = await getAliasInfo(program.opts().domainname, program.opts().activeonly);
      console.log(AliasInfo);

      // Gracefully exit with success code 0
      process.exit(0);
    } catch (error) {
      console.error('An error occurred: ${error}');
      process.exit(1);
    }
  }
  
  main();