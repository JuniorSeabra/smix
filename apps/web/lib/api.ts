export function getToken() {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('smix_access_token');
}

export function logout() {
  if (typeof window === 'undefined') return;
  localStorage.removeItem('smix_access_token');
  window.location.href = '/';
}

export async function apiFetch(path: string, init: RequestInit = {}) {
  const token = getToken();
  const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}${path}`, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...init.headers,
    },
  });
  if (res.status === 401 && typeof window !== 'undefined') {
    localStorage.removeItem('smix_access_token');
    window.location.href = '/';
  }
  return res;
}
