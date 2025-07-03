import crypto from 'crypto';

/**
 * Verify Meta webhook signature for security
 * This ensures the webhook actually came from Meta and wasn't forged
 */
export function verifyWebhookSignature(
  payload: string | Buffer,
  signature: string | null,
  secret: string
): boolean {
  if (!signature || !secret) {
    console.warn('Missing webhook signature or secret');
    return false;
  }

  try {
    // Meta sends signatures in format: sha256=<hash>
    const expectedSignature = signature.startsWith('sha256=') 
      ? signature 
      : `sha256=${signature}`;

    // Create expected signature
    const payloadBuffer = Buffer.isBuffer(payload) ? payload : Buffer.from(payload, 'utf8');
    const expectedHash = crypto
      .createHmac('sha256', secret)
      .update(payloadBuffer)
      .digest('hex');
    
    const expectedSignatureFull = `sha256=${expectedHash}`;

    // Use crypto.timingSafeEqual to prevent timing attacks
    const signatureBuffer = Buffer.from(expectedSignature, 'utf8');
    const expectedBuffer = Buffer.from(expectedSignatureFull, 'utf8');

    if (signatureBuffer.length !== expectedBuffer.length) {
      return false;
    }

    return crypto.timingSafeEqual(signatureBuffer, expectedBuffer);
  } catch (error) {
    console.error('Webhook signature verification error:', error);
    return false;
  }
}

/**
 * Extract and validate webhook headers
 */
export function extractWebhookHeaders(request: Request) {
  return {
    signature: request.headers.get('x-hub-signature-256'),
    timestamp: request.headers.get('x-hub-timestamp'),
    userAgent: request.headers.get('user-agent')
  };
}

/**
 * Validate webhook timestamp to prevent replay attacks
 */
export function isWebhookTimestampValid(
  timestamp: string | null,
  toleranceSeconds: number = 300 // 5 minutes
): boolean {
  if (!timestamp) {
    return false;
  }

  try {
    const webhookTime = parseInt(timestamp, 10) * 1000; // Convert to milliseconds
    const currentTime = Date.now();
    const timeDifference = Math.abs(currentTime - webhookTime);

    return timeDifference <= toleranceSeconds * 1000;
  } catch (error) {
    console.error('Timestamp validation error:', error);
    return false;
  }
}

/**
 * Complete webhook security validation
 */
export function validateWebhookSecurity(
  request: Request,
  payload: string | Buffer,
  secret: string,
  options: {
    validateTimestamp?: boolean;
    timestampTolerance?: number;
  } = {}
): { valid: boolean; error?: string } {
  const { signature, timestamp, userAgent } = extractWebhookHeaders(request);

  // Check User-Agent (Meta webhooks have specific user agents)
  if (userAgent && !userAgent.includes('facebookplatform')) {
    return { valid: false, error: 'Invalid user agent' };
  }

  // Validate timestamp if enabled
  if (options.validateTimestamp && !isWebhookTimestampValid(timestamp, options.timestampTolerance)) {
    return { valid: false, error: 'Invalid or expired timestamp' };
  }

  // Verify signature
  if (!verifyWebhookSignature(payload, signature, secret)) {
    return { valid: false, error: 'Invalid signature' };
  }

  return { valid: true };
}

/**
 * Middleware function for webhook security
 */
export function createWebhookSecurityMiddleware(secret: string) {
  return async (request: Request, payload: string | Buffer) => {
    const validation = validateWebhookSecurity(request, payload, secret, {
      validateTimestamp: process.env.NODE_ENV === 'production',
      timestampTolerance: 300
    });

    if (!validation.valid) {
      throw new Error(`Webhook security validation failed: ${validation.error}`);
    }

    return true;
  };
} 