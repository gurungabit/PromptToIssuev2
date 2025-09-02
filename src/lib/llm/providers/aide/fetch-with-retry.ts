/**
 * Fetch utility with retry functionality for AIDE API calls
 */

export interface RetryOptions {
  maxRetries?: number;
  initialDelay?: number;
  maxDelay?: number;
  backoffMultiplier?: number;
  retryCondition?: (error: unknown) => boolean;
}

export interface FetchWithRetryOptions extends RetryOptions {
  timeout?: number;
}

const DEFAULT_OPTIONS: Required<RetryOptions> = {
  maxRetries: 3,
  initialDelay: 1000, // 1 second
  maxDelay: 30000, // 30 seconds
  backoffMultiplier: 2,
  retryCondition: (error: unknown) => {
    // Retry on network errors, timeouts, and 5xx status codes
    if (error instanceof Error) {
      const errorMessage = error.message.toLowerCase();
      return (
        errorMessage.includes('network') ||
        errorMessage.includes('timeout') ||
        errorMessage.includes('fetch') ||
        errorMessage.includes('5')
      );
    }
    return false;
  }
};

/**
 * Sleep utility function
 */
function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Calculate delay with exponential backoff and jitter
 */
function calculateDelay(attempt: number, options: Required<RetryOptions>): number {
  const exponentialDelay = options.initialDelay * Math.pow(options.backoffMultiplier, attempt);
  const clampedDelay = Math.min(exponentialDelay, options.maxDelay);
  
  // Add jitter (±25% randomness)
  const jitter = clampedDelay * 0.25 * (Math.random() * 2 - 1);
  return Math.max(0, clampedDelay + jitter);
}

/**
 * Fetch with timeout support
 */
async function fetchWithTimeout(
  url: string,
  options: RequestInit & { timeout?: number }
): Promise<Response> {
  const { timeout, ...fetchOptions } = options;
  
  if (timeout) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);
    
    try {
      const response = await fetch(url, {
        ...fetchOptions,
        signal: controller.signal
      });
      clearTimeout(timeoutId);
      return response;
    } catch (error) {
      clearTimeout(timeoutId);
      throw error;
    }
  }
  
  return fetch(url, fetchOptions);
}

/**
 * Enhanced fetch function with retry logic, timeout, and exponential backoff
 */
export async function fetchWithRetry(
  url: string,
  options: RequestInit & FetchWithRetryOptions = {}
): Promise<Response> {
  const {
    maxRetries,
    initialDelay,
    maxDelay,
    backoffMultiplier,
    retryCondition,
    timeout,
    ...fetchOptions
  } = { ...DEFAULT_OPTIONS, ...options };

  let lastError: unknown;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      console.log(`Attempting fetch (attempt ${attempt + 1}/${maxRetries + 1}) to: ${url}`);
      
      const response = await fetchWithTimeout(url, {
        ...fetchOptions,
        timeout
      });

      // Check if response is successful or a client error (4xx) that shouldn't be retried
      if (response.ok || (response.status >= 400 && response.status < 500)) {
        if (attempt > 0) {
          console.log(`Request succeeded after ${attempt + 1} attempts`);
        }
        return response;
      }

      // Server error (5xx) - might be worth retrying
      const error = new Error(`HTTP ${response.status}: ${response.statusText}`);
      
      if (attempt === maxRetries || !retryCondition(error)) {
        throw error;
      }

      lastError = error;
      console.warn(`Request failed with ${response.status}, retrying in ${calculateDelay(attempt, { maxRetries, initialDelay, maxDelay, backoffMultiplier, retryCondition })}ms...`);

    } catch (error) {
      lastError = error;

      // If this is the last attempt or the error shouldn't be retried, throw it
      if (attempt === maxRetries || !retryCondition(error)) {
        console.error(`Request failed after ${attempt + 1} attempts:`, error);
        throw error;
      }

      const delay = calculateDelay(attempt, { maxRetries, initialDelay, maxDelay, backoffMultiplier, retryCondition });
      console.warn(`Request failed (attempt ${attempt + 1}), retrying in ${delay}ms...`, error);
      await sleep(delay);
    }
  }

  // This should never be reached, but just in case
  throw lastError || new Error('Maximum retries exceeded');
}

/**
 * AIDE-specific fetch function with optimized retry settings
 */
export async function fetchAideAPI(
  url: string,
  options: RequestInit & Partial<FetchWithRetryOptions> = {}
): Promise<Response> {
  const aideOptions: FetchWithRetryOptions = {
    maxRetries: 3,
    initialDelay: 2000, // 2 seconds (AIDE can be slower)
    maxDelay: 15000, // 15 seconds max
    timeout: 120000, // 120 second timeout for AIDE API
    retryCondition: (error: unknown) => {
      if (error instanceof Error) {
        const errorMessage = error.message.toLowerCase();
        // Retry on network errors, timeouts, and 5xx status codes
        // Don't retry on 4xx client errors (auth, bad request, etc.)
        return (
          errorMessage.includes('network') ||
          errorMessage.includes('timeout') ||
          errorMessage.includes('fetch') ||
          errorMessage.includes('aborted') ||
          (errorMessage.includes('http') && errorMessage.includes('5'))
        );
      }
      return false;
    },
    ...options
  };

  return fetchWithRetry(url, aideOptions);
}
