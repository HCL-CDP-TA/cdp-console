import { AuthState } from '@/types/auth';

export const getAuthState = (): AuthState => {
  if (typeof window === 'undefined') {
    return { isAuthenticated: false, token: null, username: null };
  }

  const token = localStorage.getItem('auth-token');
  const username = localStorage.getItem('auth-username');
  
  return {
    isAuthenticated: !!token,
    token,
    username
  };
};

export const setAuthState = (token: string, username: string) => {
  localStorage.setItem('auth-token', token);
  localStorage.setItem('auth-username', username);
};

export const clearAuthState = () => {
  localStorage.removeItem('auth-token');
  localStorage.removeItem('auth-username');
};

export const isTokenExpired = (token: string): boolean => {
  try {
    const payload = JSON.parse(atob(token.split('.')[1]));
    const currentTime = Math.floor(Date.now() / 1000);
    return payload.exp < currentTime;
  } catch (error) {
    return true; // If we can't parse the token, consider it expired
  }
};

export const validateAuthState = (): { isValid: boolean; shouldRedirect: boolean } => {
  const authState = getAuthState();
  
  if (!authState.isAuthenticated || !authState.token) {
    return { isValid: false, shouldRedirect: true };
  }
  
  if (isTokenExpired(authState.token)) {
    clearAuthState();
    return { isValid: false, shouldRedirect: true };
  }
  
  return { isValid: true, shouldRedirect: false };
};

export const hashPassword = async (password: string): Promise<string> => {
  const encoder = new TextEncoder();
  const data = encoder.encode(password);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
};