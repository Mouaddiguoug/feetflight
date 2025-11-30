import cluster from 'node:cluster';
import os from 'node:os';
import process from 'node:process';

if (cluster.isPrimary) {
  const numCPUs = os.availableParallelism();
  console.log(`Primary process ${process.pid} is running`);
  console.log(`Forking ${numCPUs} workers...`);

  for (let i = 0; i < numCPUs; i++) {
    cluster.fork();
  }

  cluster.on('exit', (worker, code, signal) => {
    console.log(`Worker ${worker.process.pid} died (${signal || code}). Restarting...`);
    cluster.fork();
  });
} else {
  await import('./server');
  console.log(`Worker ${process.pid} started`);
}
