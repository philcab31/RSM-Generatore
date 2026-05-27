const encoder = new TextEncoder();

async function getSecretKey(secret: string) {
  return crypto.subtle.importKey(
    'raw',
    encoder.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign', 'verify']
  );
}

/**
 * Signs a payload into a JWT token using the HMAC SHA-256 algorithm.
 */
export async function signToken(payload: any, secret: string): Promise<string> {
  const header = { alg: 'HS256', typ: 'JWT' };
  const base64Header = btoa(JSON.stringify(header))
    .replace(/=/g, '')
    .replace(/\+/g, '-')
    .replace(/\//g, '_');
  const base64Payload = btoa(JSON.stringify(payload))
    .replace(/=/g, '')
    .replace(/\+/g, '-')
    .replace(/\//g, '_');
  
  const tokenData = `${base64Header}.${base64Payload}`;
  const key = await getSecretKey(secret);
  const signature = await crypto.subtle.sign(
    'HMAC',
    key,
    encoder.encode(tokenData)
  );
  
  const base64Signature = btoa(String.fromCharCode(...new Uint8Array(signature)))
    .replace(/=/g, '')
    .replace(/\+/g, '-')
    .replace(/\//g, '_');
    
  return `${tokenData}.${base64Signature}`;
}

/**
 * Verifies a JWT token signature and checks expiration.
 * Returns the decoded payload if valid, or null if invalid/expired.
 */
export async function verifyToken(token: string, secret: string): Promise<any | null> {
  const parts = token.split('.');
  if (parts.length !== 3) return null;
  
  const [header, payload, signature] = parts;
  const tokenData = `${header}.${payload}`;
  
  try {
    const key = await getSecretKey(secret);
    
    // Decode signature from base64url
    const signatureBytes = Uint8Array.from(
      atob(signature.replace(/-/g, '+').replace(/_/g, '/')),
      c => c.charCodeAt(0)
    );
    
    const isValid = await crypto.subtle.verify(
      'HMAC',
      key,
      signatureBytes,
      encoder.encode(tokenData)
    );
    
    if (!isValid) return null;
    
    const decodedPayload = JSON.parse(
      atob(payload.replace(/-/g, '+').replace(/_/g, '/'))
    );
    
    // Check expiration
    if (decodedPayload.exp && Date.now() > decodedPayload.exp) {
      return null;
    }
    
    return decodedPayload;
  } catch (e) {
    return null;
  }
}
