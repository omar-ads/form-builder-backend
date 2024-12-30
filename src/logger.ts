const { createLogger, format, transports } = require("winston");
const DailyRotateFile = require("winston-daily-rotate-file");

const { combine, timestamp, printf, errors } = format;

// Define the log format
const logFormat = printf(
  ({
    level,
    message,
    timestamp,
    stack,
  }: {
    level: string;
    message: string;
    timestamp: string;
    stack: string;
  }) => {
    return `${timestamp} [${level.toUpperCase()}]: ${stack || message}`;
  }
);

// Create the logger
const logger = createLogger({
  level: "info", // Default log level
  format: combine(
    timestamp({ format: "YYYY-MM-DD HH:mm:ss" }),
    errors({ stack: true }),
    logFormat
  ),
  transports: [
    new transports.Console({
      format: combine(format.colorize(), logFormat),
    }),
    new DailyRotateFile({
      filename: "logs/%DATE%-combined.log",
      datePattern: "YYYY-MM-DD",
      maxSize: "20m",
      maxFiles: "14d",
      level: "info",
    }),
    new DailyRotateFile({
      filename: "logs/%DATE%-error.log",
      datePattern: "YYYY-MM-DD",
      maxSize: "20m",
      maxFiles: "14d",
      level: "error",
    }),
  ],
});

export default logger;
