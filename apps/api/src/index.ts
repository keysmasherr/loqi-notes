import { app } from './server';
import { config } from './config';
import { logger } from './lib/logger';

const port = config.port;

app.listen(port, () => {
  logger.info(`🚀 Server running on http://localhost:${port}`);
  logger.info(`📊 Health check: http://localhost:${port}/health`);
  logger.info(`🔌 tRPC endpoint: http://localhost:${port}/api/v1/trpc`);
  logger.info(`🌍 Environment: ${config.env}`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  logger.info('SIGTERM signal received: closing HTTP server');
  process.exit(0);
});

process.on('SIGINT', () => {
  logger.info('SIGINT signal received: closing HTTP server');
  process.exit(0);
});
