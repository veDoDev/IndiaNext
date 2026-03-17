import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:8000";

export const analyzePhishing = async (text) => {
  const res = await axios.post(`${API_URL}/analyze/phishing`, { text });
  return res.data;
};

export const analyzeInjection = async (text) => {
  const res = await axios.post(`${API_URL}/analyze/injection`, { text });
  return res.data;
};

export const analyzeBehaviour = async (events) => {
  const res = await axios.post(`${API_URL}/analyze/behaviour`, { events });
  return res.data;
};

export const analyzeUrl = async (text) => {
  const res = await axios.post(`${API_URL}/analyze/url`, { text });
  return res.data;
};
