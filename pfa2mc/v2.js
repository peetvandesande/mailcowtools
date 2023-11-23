// Written by Peet van de Sande, peet@peetvandesande.com
// MIT License

const axios = require('axios');
const inquirer = require('inquirer');
const { program } = require('commander');
const { configureDb } = require('./mysql');

let axiosInstance = null;
let dbPool = null;

const configureAxios = () => {
  return axios.create({
    baseURL: program.serverurl,
    headers: { 'X-API-Key': program.apikey, 'Content-Type': 'application/json' }
  });
}

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

const importDb = async (domain, activeonly = false) => {
  const query = `SELECT local_part, domain, name, quota, password, password AS password2, active FROM mailbox WHERE domain='${domain}'${activeonly ? ' AND active=1' : ''}`;

  console.log(`query: ${query}`);

  try {
    const [results, fields] = await dbPool.queryAsync(query);
    console.log('Results:', results);  // Log raw results

    return results;  // Return the array of rows directly
  } catch (error) {
    console.error(`Error while importing from the database:\n${error}`);
    process.exit(-1);
  }
}

const addMailbox = async (mailboxInfo) => {
  try {
    const result = await axiosInstance.post('/api/v1/add/mailbox', mailboxInfo);
    if (result.status !== 200) {
      console.error(`Error while creating mailbox ${mailboxInfo.local_part}@${mailboxInfo.domain}.`);
      process.exit(3);
    }
    console.log(`Created mailbox ${mailboxInfo.local_part}@${mailboxInfo.domain} with quota ${mailboxInfo.quota} MB`);
  } catch (error) {
    console.error(`Error while adding Mailbox ${mailboxInfo.local_part}@${mailboxInfo.domain}:\n${error}`);
    process.exit(2);
  }
}

const addMailboxes = async (mailboxInfos) => {
  console.log(`Beginning import of ${mailboxInfos.length} mailboxes`);
  for (const mailboxInfo of mailboxInfos) {
    await addMailbox(mailboxInfo);
  }
}

const main = async () => {
  program.version(require('./package').version);

  program
    .option('-a, --activeonly', 'Only import active mailboxes')
    .requiredOption('-d, --dburi <dburi>', 'URI to Postfix Admin: mysql://user@server/dbname')
    .option('-e, --exitonerror', 'Exit on first error')
    .requiredOption('-n, --domainname <domain>', 'Domain for which to migrate mailboxes')
    .option('-p, --password <password>', 'Pass password as argument')
    .parse();

  try {
    const password = program.opts().password || await promptPassword();

    console.log(program.opts());

    //axiosInstance = configureAxios();
    dbPool = await configureDb(program.opts().dburi, password);
    const mailboxInfos = await importDb(program.opts().domainname);
    //console.log(JSON.stringify(mailboxInfos, null, '\t'));
    console.log(mailboxInfos);

    // Uncomment the line below if you want to enable mailbox import
    // await addMailboxes(mailboxInfos);

    // Gracefully exit with success code 0
    process.exit(0);
  } catch (error) {
    console.error('An error occurred: ${error}');
    process.exit(1);
  }
}

main();