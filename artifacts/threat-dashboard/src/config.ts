// Dynamic API base URL configuration
export function getApiBaseUrl(): string {
  // Use port 3001 for backend
  if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
    return 'http://localhost:3001';
  }
  // For network access, use the current hostname with port 3001
  return `http://${window.location.hostname}:3001`;
}

export const API_BASE_URL = getApiBaseUrl();
