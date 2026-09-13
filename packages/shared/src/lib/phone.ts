/**
 * Strips all non-digit characters and standardizes Indian mobile numbers.
 */
export function sanitizeIndianPhone(input: string): {
  isValid: boolean;
  clean10Digits: string;
  e164Format: string;
} {
  // Remove spaces, hyphens, parentheses, and leading +91 or 0
  let digits = input.replace(/\D/g, '');

  if (digits.startsWith('91') && digits.length === 12) {
    digits = digits.slice(2);
  } else if (digits.startsWith('0') && digits.length === 11) {
    digits = digits.slice(1);
  }

  // An authentic Indian mobile number must be exactly 10 digits and start with 6, 7, 8, or 9
  const isValid = /^[6-9]\d{9}$/.test(digits);

  return {
    isValid,
    clean10Digits: digits,
    e164Format: `+91${digits}`,
  };
}

/**
 * Extracts and validates a 10-digit Indian phone number with descriptive error messaging.
 */
export function extractValidIndianPhone(rawInput: string): {
  isValid: boolean;
  digits10: string;
  e164Phone: string;
  error?: string;
} {
  if (!rawInput) {
    return { isValid: false, digits10: '', e164Phone: '', error: 'Phone number is required' };
  }

  // Strip all non-digit characters
  let digits = rawInput.replace(/\D/g, '');

  // Strip leading international country codes if present
  if (digits.length === 12 && digits.startsWith('91')) {
    digits = digits.slice(2);
  } else if (digits.length === 11 && digits.startsWith('0')) {
    digits = digits.slice(1);
  }

  // Validate exactly 10 digits starting with 6, 7, 8, or 9
  const isValid = /^[6-9]\d{9}$/.test(digits);

  if (!isValid) {
    return {
      isValid: false,
      digits10: digits,
      e164Phone: '',
      error: 'Please enter a valid 10-digit Indian mobile number (starts with 6-9).'
    };
  }

  return {
    isValid: true,
    digits10: digits,
    e164Phone: `+91${digits}`
  };
}
