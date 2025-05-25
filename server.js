const express = require('express');
const http = require('http');
const WebSocket = require('ws');
const sdk = require('microsoft-cognitiveservices-speech-sdk');
require('dotenv').config();

const app = express();
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

app.get('/', (_, res) => res.send('WebSocket Speech Server is running'));

wss.on('connection', (ws) => {
  console.log('Client connected');

  const pushStream = sdk.AudioInputStream.createPushStream();

  const speechConfig = sdk.SpeechConfig.fromSubscription(
    process.env.AZURE_SPEECH_KEY,
    process.env.AZURE_REGION
  );
  speechConfig.speechRecognitionLanguage = 'en-US';
  const audioConfig = sdk.AudioConfig.fromStreamInput(pushStream);
  const recognizer = new sdk.SpeechRecognizer(speechConfig, audioConfig);

  recognizer.recognizing = (_, e) => {
    if (e.result.text) {
      ws.send(JSON.stringify({ partial: e.result.text }));
    }
  };

  recognizer.recognized = (_, e) => {
    if (e.result.text) {
      ws.send(JSON.stringify({ text: e.result.text }));
    }
  };

  recognizer.startContinuousRecognitionAsync();

  ws.on('message', (data) => {
    pushStream.write(data);
  });

  ws.on('close', () => {
    pushStream.close();
    recognizer.stopContinuousRecognitionAsync();
    console.log('Client disconnected');
  });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => console.log(`WebSocket server running on port ${PORT}`));
