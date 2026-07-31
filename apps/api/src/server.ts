import { createApp } from './app.js';

const app = await createApp();

try {
  await app.listen({ host: '0.0.0.0', port: 3000 });
} catch (error) {
  app.log.error(error);
  process.exitCode = 1;
}
