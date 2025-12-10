// Client-side fetch wrapper that automatically adds auth token
// Use this instead of fetch() for API calls

export async function fetchWithAuth(
  url: string,
  options: RequestInit = {}
): Promise<Response> {
  // Get auth token from localStorage
  let token: string | null = null;
  if (typeof window !== 'undefined') {
    token = localStorage.getItem('authToken');
  }

  // Merge headers
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
    ...options.headers,
  };

  // Add auth token if available
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  // Make the fetch request with updated headers
  return fetch(url, {
    ...options,
    headers,
  });
}


