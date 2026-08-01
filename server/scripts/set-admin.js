/**
 * Creates the admin account, or resets its password.
 *
 *   node server/scripts/set-admin.js <email> <password>
 *
 * Passing the password as an argument puts it in your shell history; with no
 * arguments the script prompts for it instead, which is the safer path.
 */
import readline from 'node:readline/promises';
import { stdin, stdout } from 'node:process';
import { migrate } from '../db.js';
import { findUserByEmail, createUser, setUserPassword, hashPassword } from '../auth.js';

const MIN_LENGTH = 10;

async function prompt() {
  const rl = readline.createInterface({ input: stdin, output: stdout });
  const email = (await rl.question('Admin email: ')).trim();
  const password = (await rl.question('Password (min 10 chars): ')).trim();
  const confirm = (await rl.question('Repeat password: ')).trim();
  rl.close();
  if (password !== confirm) {
    console.error('\nPasswords do not match.');
    process.exit(1);
  }
  return { email, password };
}

const main = async () => {
  migrate();

  let [email, password] = process.argv.slice(2);
  if (!email || !password) ({ email, password } = await prompt());

  if (!email.includes('@')) {
    console.error('That does not look like an email address.');
    process.exit(1);
  }
  if (password.length < MIN_LENGTH) {
    console.error(`Password must be at least ${MIN_LENGTH} characters.`);
    process.exit(1);
  }

  const hash = await hashPassword(password);
  const existing = findUserByEmail(email);

  if (existing) {
    setUserPassword(email, hash);
    console.log(`Password updated for ${email}.`);
  } else {
    createUser({ email, passwordHash: hash, role: 'admin' });
    console.log(`Admin account created for ${email}.`);
  }
};

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
