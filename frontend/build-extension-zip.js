/**
 * Rebuilds sekure-extension.zip from ../extension/ into public/
 * Run automatically via `npm run build` (prebuild hook) or manually.
 */
import { execSync } from 'child_process';
import { existsSync, unlinkSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const zipPath = resolve(__dirname, 'public', 'sekure-extension.zip');
const extDir = resolve(__dirname, '..', 'extension');

if (existsSync(zipPath)) unlinkSync(zipPath);

const isWin = process.platform === 'win32';

if (isWin) {
    execSync(
        `powershell -NoProfile -Command "Compress-Archive -Path '${extDir}\\*' -DestinationPath '${zipPath}' -CompressionLevel Optimal"`,
        { stdio: 'inherit' }
    );
} else {
    execSync(`cd "${extDir}" && zip -r "${zipPath}" .`, { stdio: 'inherit' });
}

console.log('✓ sekure-extension.zip rebuilt from extension/');
