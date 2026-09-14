import axios from 'axios';
import { io } from 'socket.io-client';

export const api = axios.create({ baseURL: '/api' });

export const socket = io('/', { path: '/socket.io' });

export async function fetchWaStatus() {
  const { data } = await api.get('/wa/status');
  return data;
}

export async function logoutWa() {
  const { data } = await api.post('/wa/logout');
  return data;
}

export async function uploadContacts(file, name, message) {
  const form = new FormData();
  form.append('file', file);
  form.append('name', name);
  form.append('message', message);
  const { data } = await api.post('/upload', form, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return data;
}

export async function uploadBanner(campaignId, file) {
  const form = new FormData();
  form.append('banner', file);
  const { data } = await api.post(`/campaigns/${campaignId}/banner`, form, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return data;
}

export async function removeBanner(campaignId) {
  const { data } = await api.delete(`/campaigns/${campaignId}/banner`);
  return data;
}

export async function startCampaign(campaignId, message, delayMs) {
  const { data } = await api.post(`/campaigns/${campaignId}/send`, { message, delayMs });
  return data;
}

export async function pauseCampaign(campaignId) {
  const { data } = await api.post(`/campaigns/${campaignId}/pause`);
  return data;
}

export async function resumeCampaign(campaignId) {
  const { data } = await api.post(`/campaigns/${campaignId}/resume`);
  return data;
}

export async function stopCampaign(campaignId) {
  const { data } = await api.post(`/campaigns/${campaignId}/stop`);
  return data;
}

export async function fetchCampaign(campaignId) {
  const { data } = await api.get(`/campaigns/${campaignId}`);
  return data;
}

export async function fetchContacts(campaignId, status, page = 1) {
  const { data } = await api.get(`/campaigns/${campaignId}/contacts`, {
    params: { status, page, pageSize: 100 },
  });
  return data;
}
