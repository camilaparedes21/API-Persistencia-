/* Hash de contraseñas con scrypt (módulo crypto de Node, sin dependencias externas).
 Se guarda como "scrypt$<salt>$<hash>", así nunca queda la contraseña en texto plano.
 Cada contraseña tiene su propio salt aleatorio: dos usuarios con la misma
 contraseña quedan con hashes distintos.*/

const crypto = require('crypto');

const KEY_LENGTH = 64;
const PREFIX = 'scrypt';

function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = crypto.scryptSync(password, salt, KEY_LENGTH).toString('hex');
  return `${PREFIX}$${salt}$${hash}`;
}

// Compara una contraseña con un hash guardado, en tiempo constante.
function verifyPassword(password, stored) {
  if (typeof stored !== 'string') return false;
  const [prefix, salt, hash] = stored.split('$');
  if (prefix !== PREFIX || !salt || !hash) return false;

  const expected = Buffer.from(hash, 'hex');
  const actual = crypto.scryptSync(password, salt, expected.length);
  return expected.length === actual.length && crypto.timingSafeEqual(expected, actual);
}

function isHashed(value) {
  return typeof value === 'string' && value.startsWith(`${PREFIX}$`);
}

module.exports = { hashPassword, verifyPassword, isHashed };
