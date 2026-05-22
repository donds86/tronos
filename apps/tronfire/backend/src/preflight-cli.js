import 'dotenv/config';
import { runPreflight } from './preflight.js';
const result = await runPreflight();
console.log(JSON.stringify(result, null, 2));
process.exit(result.ok ? 0 : 1);
