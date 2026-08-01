import { createApp } from './app.js';
import { createDeterministicDemoOptions } from './runtime-composition.js';

if (process.env.NODE_ENV === 'production') {
  throw new Error(
    'Production composition requires an explicitly configured provider, PostgreSQL repository, and private object store.',
  );
}

const app = await createApp(await createDeterministicDemoOptions());

try {
  await app.listen({ host: '0.0.0.0', port: 3000 });
} catch (error) {
  app.log.error(error);
  process.exitCode = 1;
}
