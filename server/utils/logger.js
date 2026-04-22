const fs = require('fs');
const path = require('path');

const logFile = path.join(__dirname, 'server.log');

const log = (message) => {
  const timestamp = new Date().toISOString();
  const formattedMessage = `[${timestamp}] ${message}\n`;
  fs.appendFileSync(logFile, formattedMessage);
  console.log(formattedMessage.trim());
};

const error = (message, err) => {
  const timestamp = new Date().toISOString();
  const stack = err ? `\n${err.stack}` : '';
  const formattedMessage = `[${timestamp}] ERROR: ${message}${stack}\n`;
  fs.appendFileSync(logFile, formattedMessage);
  console.error(formattedMessage.trim());
};

module.exports = { log, error };
