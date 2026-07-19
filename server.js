// Servidor de verificación de cuentas por email
// Fase 1: solo se encarga de mandar un código por correo y comprobarlo.
// El resto de la app (horarios, reservas...) sigue funcionando como hasta ahora.

require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { Resend } = require('resend');

const app = express();
app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 3000;
const RESEND_API_KEY = process.env.RESEND_API_KEY || '';
const FROM_EMAIL = process.env.FROM_EMAIL || 'onboarding@resend.dev';

// Si no hay clave de Resend configurada, entramos en "modo desarrollo":
// el código no se envía de verdad, se imprime en la consola del servidor.
// Así puedes probar todo el flujo antes de tener tu cuenta de Resend.
const DEV_MODE = !RESEND_API_KEY || RESEND_API_KEY === 'tu_clave_aqui';
const resend = DEV_MODE ? null : new Resend(RESEND_API_KEY);

// --- Almacenamiento en memoria (fase 1) ---
// pendingCodes: email -> { code, expiresAt, attempts }
// Se reinicia si el servidor se reinicia. En una fase futura esto pasaría
// a una base de datos real para que sobreviva a los reinicios/despliegues.
const pendingCodes = new Map();
const lastSentAt = new Map(); // email -> timestamp, para limitar reenvíos

const CODE_TTL_MS = 10 * 60 * 1000;      // el código caduca a los 10 minutos
const RESEND_COOLDOWN_MS = 30 * 1000;    // mínimo 30s entre reenvíos al mismo email
const MAX_ATTEMPTS = 5;                  // intentos de introducir el código

function isValidEmail(email) {
  return typeof email === 'string' && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}
function generateCode() {
  return String(Math.floor(100000 + Math.random() * 900000)); // 6 dígitos
}

// POST /api/verify/start  { email }
// Genera un código, lo guarda temporalmente y lo envía por correo.
app.post('/api/verify/start', async (req, res) => {
  const email = (req.body.email || '').trim().toLowerCase();
  if (!isValidEmail(email)) {
    return res.status(400).json({ ok: false, error: 'Ese email no parece válido.' });
  }

  const lastSent = lastSentAt.get(email) || 0;
  if (Date.now() - lastSent < RESEND_COOLDOWN_MS) {
    return res.status(429).json({ ok: false, error: 'Espera unos segundos antes de pedir otro código.' });
  }

  const code = generateCode();
  pendingCodes.set(email, { code, expiresAt: Date.now() + CODE_TTL_MS, attempts: 0 });
  lastSentAt.set(email, Date.now());

  if (DEV_MODE) {
    console.log(`[MODO DESARROLLO] Código para ${email}: ${code}`);
    return res.json({ ok: true, devMode: true, devCode: code });
  }

  try {
    await resend.emails.send({
      from: FROM_EMAIL,
      to: email,
      subject: 'Tu código de verificación',
      html: `<p>Tu código para confirmar tu cuenta es:</p>
             <p style="font-size:28px;font-weight:bold;letter-spacing:4px;">${code}</p>
             <p>Caduca en 10 minutos. Si no has pedido este código, ignora este correo.</p>`
    });
    return res.json({ ok: true });
  } catch (err) {
    console.error('Error enviando email:', err);
    return res.status(500).json({ ok: false, error: 'No se ha podido enviar el correo. Inténtalo de nuevo.' });
  }
});

// POST /api/verify/confirm  { email, code }
// Comprueba que el código introducido coincide y no ha caducado.
app.post('/api/verify/confirm', (req, res) => {
  const email = (req.body.email || '').trim().toLowerCase();
  const code = (req.body.code || '').trim();

  const entry = pendingCodes.get(email);
  if (!entry) {
    return res.status(400).json({ ok: false, error: 'No hay ningún código pendiente para ese email. Pide uno nuevo.' });
  }
  if (Date.now() > entry.expiresAt) {
    pendingCodes.delete(email);
    return res.status(400).json({ ok: false, error: 'El código ha caducado. Pide uno nuevo.' });
  }
  entry.attempts += 1;
  if (entry.attempts > MAX_ATTEMPTS) {
    pendingCodes.delete(email);
    return res.status(429).json({ ok: false, error: 'Demasiados intentos. Pide un código nuevo.' });
  }
  if (entry.code !== code) {
    return res.status(400).json({ ok: false, error: 'Código incorrecto.' });
  }

  pendingCodes.delete(email);
  return res.json({ ok: true, verified: true });
});

app.get('/api/health', (req, res) => {
  res.json({ ok: true, devMode: DEV_MODE });
});

app.listen(PORT, () => {
  console.log(`Servidor escuchando en el puerto ${PORT}`);
  if (DEV_MODE) {
    console.log('⚠️  MODO DESARROLLO: los códigos no se envían por email de verdad, se muestran aquí en la consola.');
    console.log('   Configura RESEND_API_KEY en tu archivo .env para enviarlos de verdad.');
  }
});
