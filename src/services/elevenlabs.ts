import axios from 'axios';
export interface Voice {
  voice_id: string;
  name: string;
}

export interface Model {
  model_id: string;
  name: string;
}

const BASE_URL = 'https://api.elevenlabs.io/v1';

export const getVoices = async (apiKey: string): Promise<Voice[]> => {
  const response = await axios.get(`${BASE_URL}/voices`, {
    headers: { 'xi-api-key': apiKey }
  });
  return response.data.voices;
};

export const getModels = async (apiKey: string): Promise<Model[]> => {
  const response = await axios.get(`${BASE_URL}/models`, {
    headers: { 'xi-api-key': apiKey }
  });
  return response.data;
};

export const generateSpeech = async (
  apiKey: string,
  text: string,
  voiceId: string,
  modelId: string
): Promise<ArrayBuffer> => {
  const response = await axios.post(
    `${BASE_URL}/text-to-speech/${voiceId}`,
    {
      text,
      model_id: modelId,
    },
    {
      headers: {
        'xi-api-key': apiKey,
        'Content-Type': 'application/json',
      },
      responseType: 'arraybuffer',
    }
  );
  return response.data;
};