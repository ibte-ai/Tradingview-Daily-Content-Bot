import path from 'path';
import dotenv from 'dotenv';

console.log('Cwd:', process.cwd());
console.log('__dirname:', __dirname);

const path1 = path.resolve(__dirname, '../../.env');
const path2 = path.resolve(__dirname, '../../../.env');

console.log('Path 1:', path1);
console.log('Path 2:', path2);

const res1 = dotenv.config({ path: path1 });
console.log('Result 1 error:', res1.error?.message);

const res2 = dotenv.config({ path: path2 });
console.log('Result 2 error:', res2.error?.message);

console.log('API_SECRET_KEY:', process.env.API_SECRET_KEY);
console.log('DATABASE_URL:', process.env.DATABASE_URL);
