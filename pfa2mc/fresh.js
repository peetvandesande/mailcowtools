const program = require('commander');
const inquirer = require('inquirer');
const DatabaseManager = require('./databaseManager');

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
      
      //const password = program.opts().password || await promptPassword();
      //const dbManager = new DatabaseManager(program.opts().dburi, password);
      const dbManager = new DatabaseManager(program.opts().dburi, program.opts().Pp ? await promptPassword() : program.opts().password);
      
      const DomainInfo = await dbManager.getDomains(program.opts().activeonly);
//      console.log(DomainInfo);

      const MailboxInfo = await dbManager.getMailboxes(program.opts().domainname, program.opts().activeonly);
//      console.log(MailboxInfo);

      const AliasInfo = await dbManager.getAliases(program.opts().domainname, program.opts().activeonly);
//      console.log(AliasInfo);

      // Gracefully exit with success code 0
      process.exit(0);
    } catch (error) {
      console.error('An error occurred: ${error}');
      process.exit(1);
    }
  }
  
  main();