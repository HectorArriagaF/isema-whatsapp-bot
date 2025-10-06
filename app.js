// Import Express.js
const express = require('express');

// Create an Express app
const app = express();

// Middleware to parse JSON bodies
app.use(express.json());

// Set port and verify_token
const port = process.env.PORT || 3000;
const verifyToken = process.env.VERIFY_TOKEN;

// Import fetch for Node.js
const fetch = (...args) => import('node-fetch').then(({default: fetch}) => fetch(...args));

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
  const timestamp = new Date().toISOString().replace('T', ' ').slice(0, 19);
  console.log(`\n\nWebhook received ${timestamp}\n`);
  console.log(JSON.stringify(req.body, null, 2));
  
  // ✅ NUEVO: Enviar mensajes a n8n para el AI Agent
  try {
    if (req.body.entry?.[0]?.changes?.[0]?.value?.messages) {
      const messageData = {
        telefono: req.body.entry[0].changes[0].value.contacts[0].wa_id,
        mensaje: req.body.entry[0].changes[0].value.messages[0].text?.body,
        sessionId: `whatsapp_${req.body.entry[0].changes[0].value.contacts[0].wa_id}`,
        chatInput: req.body.entry[0].changes[0].value.messages[0].text?.body
      };
      
      console.log('📤 Enviando a n8n:', messageData);
      
      // Enviar a n8n
      const response = await fetch('https://isema.app.n8n.cloud/webhook/whatsapp-messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(messageData)
      });
      
      console.log('✅ Enviado a n8n. Status:', response.status);
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
