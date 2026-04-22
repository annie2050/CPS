const fs = require('fs');
const path = require('path');

const logFile = process.env.LOG_FILE
  ? path.resolve(process.env.LOG_FILE)
  : path.join(__dirname, '..', 'logs', 'server.log');

const writeToLogFile = (message) => {
  try {
    fs.mkdirSync(path.dirname(logFile), { recursive: true });
    fs.appendFileSync(logFile, message);
  } catch (err) {
    console.error('Failed to write log file:', err.message);
  }
};

const log = (message) => {
  const timestamp = new Date().toISOString();
  const formattedMessage = `[${timestamp}] ${message}\n`;
  writeToLogFile(formattedMessage);
  console.log(formattedMessage.trim());
};

const error = (message, err) => {
  const timestamp = new Date().toISOString();
  const stack = err ? `\n${err.stack}` : '';
  const formattedMessage = `[${timestamp}] ERROR: ${message}${stack}\n`;
  writeToLogFile(formattedMessage);
  console.error(formattedMessage.trim());
};

module.exports = { log, error };
