# Backend de verificación — Reservas de Matemáticas (Fase 1)

Este servidor hace una única cosa por ahora: cuando alguien se registra en la
app con un email, le manda un código de 6 dígitos y comprueba que lo escribe
bien. Así evitamos que se cree una cuenta con un email que no existe o que no
es suyo. El resto de la app (horarios, reservas, profesor...) sigue
funcionando exactamente igual que hasta ahora.

## Antes de nada: pruébalo en tu ordenador

No hace falta tener ninguna cuenta creada todavía. El servidor arranca en
"modo desarrollo": en vez de mandar el email de verdad, te enseña el código
en la pantalla (la consola).

1. Necesitas tener [Node.js](https://nodejs.org) instalado (descarga la
   versión "LTS", el botón grande de la web).
2. Abre una terminal dentro de esta carpeta y escribe:
   ```
   npm install
   npm start
   ```
3. Verás un mensaje como "Servidor escuchando en el puerto 3000" y un aviso
   de que está en modo desarrollo.
4. Ya está corriendo. Puedes dejarlo así mientras probamos el resto.

## Paso 2: crear tu cuenta de email real (gratis)

Cuando quieras que los códigos se manden de verdad:

1. Ve a [resend.com](https://resend.com) y crea una cuenta gratuita (con tu
   email normal, no hace falta tarjeta).
2. Dentro, ve a "API Keys" → "Create API Key" y cópiala (empieza por `re_`).
3. En esta carpeta, copia el archivo `.env.example` y renómbralo a `.env`.
4. Abre `.env` y pega tu clave en `RESEND_API_KEY=`.
5. Guarda y vuelve a arrancar el servidor (`npm start`). Ya no estará en modo
   desarrollo: los emails se mandarán de verdad, desde una dirección de
   pruebas que te deja usar Resend gratis (`onboarding@resend.dev`).

*(Más adelante, si quieres que los correos lleguen desde tu propio dominio en
vez de esa dirección de pruebas, Resend te deja verificarlo gratis también —
te ayudo con eso cuando llegue el momento.)*

## Paso 3: ponerlo en internet de verdad (para que funcione desde el móvil de los alumnos)

Mientras lo tengas solo en tu ordenador, únicamente funciona en tu propio
ordenador. Para que la app del móvil pueda hablar con él necesitas subirlo a
un servicio que lo mantenga encendido. Te recomiendo **Railway**, que tiene
un plan gratuito de sobra para esto:

1. Ve a [railway.app](https://railway.app) y crea una cuenta (puedes entrar
   con GitHub).
2. Sube esta carpeta a un repositorio de GitHub (si no sabes cómo, dime y te
   guío paso a paso — es más fácil de lo que suena).
3. En Railway: "New Project" → "Deploy from GitHub repo" → elige tu
   repositorio.
4. En la pestaña "Variables" del proyecto, añade `RESEND_API_KEY` con tu
   clave real (igual que en el `.env`, pero aquí en vez de en el archivo).
5. Railway te dará una URL pública (algo como
   `https://tu-proyecto.up.railway.app`). Esa es la dirección que la app del
   móvil usará para hablar con tu servidor.

Cuando tengas esa URL, dímela (o pégala donde te indique en la app) y
conecto la app para que la use.

## ¿Qué prueba puedo hacer ahora mismo, sin desplegar nada?

Con el servidor arrancado en tu ordenador (paso 1), puedes probarlo con estos
comandos en otra terminal:

```
curl -X POST http://localhost:3000/api/verify/start \
  -H "Content-Type: application/json" \
  -d '{"email":"tu_email@ejemplo.com"}'
```

Te devolverá el código en la propia respuesta (solo en modo desarrollo, para
que puedas probarlo sin tener aún tu cuenta de email). Luego:

```
curl -X POST http://localhost:3000/api/verify/confirm \
  -H "Content-Type: application/json" \
  -d '{"email":"tu_email@ejemplo.com","code":"EL_CODIGO_QUE_TE_HA_SALIDO"}'
```

## Qué falta todavía (siguientes fases)

- Conectar la app (el HTML) para que llame a este servidor en el paso de
  registro, en vez de crear la cuenta directamente.
- Guardar los alumnos, horarios y reservas en una base de datos real del
  servidor (ahora mismo la app sigue guardándolo todo ella sola, como hasta
  ahora).
- Recordatorios automáticos y cobro por Bizum, cuando lleguemos a esa fase.
