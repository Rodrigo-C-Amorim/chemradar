import axios from "axios";

// Em produção usa VITE_API_URL; em dev usa o proxy local (/api)
const BASE = import.meta.env.VITE_API_URL
  ? `${import.meta.env.VITE_API_URL}/api`
  : "/api";

const api = axios.create({
  baseURL: BASE,
  timeout: 90000,
});

export const getRanking = (timeframe = "today 3-m") =>
  api.get("/ranking", { params: { timeframe } }).then((r) => r.data);
export const getNiches = () => api.get("/niches").then((r) => r.data);
export const getNicheTrends = (id, timeframe = "today 12-m") =>
  api.get(`/trends/${id}`, { params: { timeframe } }).then((r) => r.data);
export const compareNiches = (ids) =>
  api.get("/compare", { params: { niches: ids.join(",") } }).then((r) => r.data);
export const getNicheNews = (id) => api.get(`/news/${id}`).then((r) => r.data);
export const getGeneralNews = () => api.get("/news/geral").then((r) => r.data);
export const getNichePapers = (id) => api.get(`/papers/${id}`).then((r) => r.data);
export const subscribe = (email) => api.post("/subscribe", { email }).then((r) => r.data);

export default api;
