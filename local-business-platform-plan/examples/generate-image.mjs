// Illustrative Antigravity handoff utility. Requires @google/genai in the NEW project.
// Not run against a paid provider during preparation of this plan.
import { GoogleGenAI } from '@google/genai';
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import path from 'node:path';

const args = process.argv.slice(2);
const value = (flag) => {
  const index = args.indexOf(flag);
  return index >= 0 ? args[index + 1] : undefined;
};
const promptFile = value('--prompt-file');
const outputFile = value('--out');
if (!promptFile || !outputFile || !process.env.GEMINI_API_KEY) {
  throw new Error('Set GEMINI_API_KEY and pass --prompt-file <file> --out <file>.');
}
const prompt = (await readFile(promptFile, 'utf8')).trim();
if (!prompt || prompt.length > 12000) throw new Error('Prompt must be 1–12000 characters.');
const client = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
const response = await client.interactions.create({
  model: process.env.GEMINI_IMAGE_MODEL || 'gemini-nano-banana-2.1',
  input: prompt,
});
const generated = response.output_image;
if (!generated?.data) throw new Error('No image returned; inspect provider status without logging secrets.');
const destination = path.resolve(outputFile);
await mkdir(path.dirname(destination), { recursive: true });
// Preserve the provider MIME type: the output extension should match actual bytes.
const mime = generated.mime_type || 'image/png';
const extensions = { 'image/png': '.png', 'image/jpeg': '.jpg', 'image/webp': '.webp' };
const extension = extensions[mime];
if (!extension) throw new Error(`Unsupported output MIME type: ${mime}`);
const actualDestination = destination.replace(/\.[^/.\\]+$/, '') + extension;
await writeFile(actualDestination, Buffer.from(generated.data, 'base64'), { flag: 'wx' });
console.log(`Saved ${actualDestination}`);
