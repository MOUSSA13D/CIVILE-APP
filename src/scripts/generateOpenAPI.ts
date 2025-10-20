import fs from 'fs/promises';
import path from 'path';
import yaml from 'js-yaml';
import { fileURLToPath } from 'url';
import { swaggerSpec } from '../config/swagger.js';

async function main() {
  const mode = process.argv[2] || 'all'; // json | yaml | all

  const __filename = fileURLToPath(import.meta.url);
  const __dirname = path.dirname(__filename);
  const outDir = path.resolve(__dirname, '../../'); // backend root (same level as package.json)

  const jsonPath = path.join(outDir, 'openapi.json');
  const yamlPath = path.join(outDir, 'openapi.yaml');

  const tasks: Promise<any>[] = [];

  if (mode === 'json' || mode === 'all') {
    tasks.push(fs.writeFile(jsonPath, JSON.stringify(swaggerSpec, null, 2), 'utf-8'));
  }
  if (mode === 'yaml' || mode === 'all') {
    const y = yaml.dump(swaggerSpec as any, { noRefs: true, lineWidth: -1 });
    tasks.push(fs.writeFile(yamlPath, y, 'utf-8'));
  }

  await Promise.all(tasks);

  // eslint-disable-next-line no-console
  console.log(`[openapi] Fichiers générés: ${[
    (mode === 'json' || mode === 'all') ? 'openapi.json' : null,
    (mode === 'yaml' || mode === 'all') ? 'openapi.yaml' : null,
  ].filter(Boolean).join(', ')}`);
}

main().catch((err) => {
  // eslint-disable-next-line no-console
  console.error('[openapi] Erreur de génération:', err);
  process.exit(1);
});
