// Import Express.js
const express = require('express');

// Create an Express app
const app = express();

// Middleware to parse JSON bodies
app.use(express.json());

// Set port and verify_token
const port = process.env.PORT || 3000;
const verifyToken = process.env.VERIFY_TOKEN;

// CORRECCIÓN: Importar node-fetch correctamente
let fetch;
import('node-fetch').then(module => {
  fetch = module.default;
}).catch(err => {
  console.error('Error importing node-fetch:', err);
});

// Route for GET requests
app.get('/', (req, res) => {
  const { 'hub.mode': mode, 'hub.challenge': challenge, 'hub.verify_token': token } = req.query;

  if (mode === 'subscribe' && token === verifyToken) {
    console.log('WEBHOOK VERIFIED');
    res.status(200).send(challenge);
  } else {
    res.status(403).end();
  }
});

// Route for POST requests
app.post('/', async (req, res) => {
  // CORRECCIÓN: Verificar que fetch esté disponible
  if (!fetch) {
    console.log('❌ node-fetch no está disponible aún');
    return res.status(200).end();
  }

  const timestamp = new Date().toISOString().replace('T', ' ').slice(0, 19);
  console.log(`\n\nWebhook received ${timestamp}\n`);
  console.log(JSON.stringify(req.body, null, 2));
  
  // ✅ CORREGIDO: Manejar botones y texto
  try {
    if (req.body.entry?.[0]?.changes?.[0]?.value?.messages) {
      const message = req.body.entry[0].changes[0].value.messages[0];
      let mensajeTexto = '';

      // Manejar diferentes tipos de mensaje
      if (message.type === 'button') {
        mensajeTexto = message.button?.text || 'Botón sin texto';
      } else if (message.type === 'text') {
        mensajeTexto = message.text?.body || 'Texto vacío';
      } else {
        mensajeTexto = `Tipo de mensaje: ${message.type}`;
      }

      const messageData = {
        telefono: +req.body.entry[0].changes[0].value.contacts[0].wa_id,
        mensaje: mensajeTexto,
        sessionId: `whatsapp_${req.body.entry[0].changes[0].value.contacts[0].wa_id}`,
        chatInput: mensajeTexto
      };
      
      console.log('📤 Enviando a n8n:', messageData);
      
      // Enviar a n8n
      const response = await fetch('https://isema.app.n8n.cloud/webhook/98bdaa99-9afa-4cfc-b19b-0257d9df3dd7', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(messageData)
      });
      
      console.log('✅ Enviado a n8n. Status:', response.status);
      
      // Si hay error, mostrar detalles
      if (!response.ok) {
        const errorText = await response.text();
        console.log('❌ Error de n8n:', errorText);
      }
    }
  } catch (error) {
    console.error('❌ Error enviando a n8n:', error);
  }
  
  res.status(200).end();
});

// Start the server
app.listen(port, () => {
  console.log(`\nListening on port ${port}\n`);
});
