/**
 * HIGH-ENTROPY RANDOMIZATION ENGINE
 * Utilizes Web Crypto API for cryptographically secure sequences.
 */

export const secureShuffle = (array: number[]): number[] => {
  const result = [...array];
  const crypto = window.crypto;
  
  for (let i = result.length - 1; i > 0; i--) {
    // Generate a random 32-bit unsigned integer
    const randomBuffer = new Uint32Array(1);
    crypto.getRandomValues(randomBuffer);
    
    // Map the random value to the range [0, i]
    const j = randomBuffer[0] % (i + 1);
    
    // Swap elements
    [result[i], result[j]] = [result[j], result[i]];
  }
  
  return result;
};

export const generateSecureSequence = (length: number): number[] => {
  const arr = Array.from({ length }, (_, i) => i + 1);
  return secureShuffle(arr);
};
