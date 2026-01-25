/**
 * Audio conversion utilities for Twilio <-> Grok
 *
 * Twilio uses: μ-law (G.711) at 8kHz
 * Grok uses: PCM16 (linear) at 24kHz
 *
 * We need to convert between these formats bidirectionally.
 */

/**
 * μ-law to Linear PCM16 conversion (ITU-T G.711)
 */
function mulawToLinear(mulawByte: number): number {
  mulawByte = ~mulawByte;

  const sign = (mulawByte & 0x80) ? -1 : 1;
  const exponent = (mulawByte >> 4) & 0x07;
  const mantissa = mulawByte & 0x0f;

  // Compute the linear value
  let sample = ((mantissa << 3) + 0x84) << exponent;
  sample = sample - 0x84;

  // Apply sign and clamp to 16-bit range
  sample = sign * sample;
  sample = Math.max(-32768, Math.min(32767, sample));

  return sample;
}

/**
 * Linear PCM16 to μ-law conversion
 */
function linearToMulaw(sample: number): number {
  const CLIP = 32635;
  const cBias = 0x84;

  let sign = (sample >> 8) & 0x80;
  if (sign !== 0) sample = -sample;
  if (sample > CLIP) sample = CLIP;
  sample = sample + cBias;

  let exponent = 7;
  let expMask = 0x4000;

  while ((sample & expMask) === 0 && exponent > 0) {
    exponent--;
    expMask >>= 1;
  }

  const mantissa = (sample >> (exponent + 3)) & 0x0f;
  const mulawByte = ~(sign | (exponent << 4) | mantissa);

  return mulawByte & 0xff;
}

/**
 * Convert Twilio μ-law 8kHz to Grok PCM16 24kHz
 *
 * @param base64Audio - Base64 encoded μ-law audio from Twilio
 * @returns Base64 encoded PCM16 audio for Grok
 */
export function convertTwilioToGrok(base64Audio: string): string {
  try {
    // Decode base64 to buffer (μ-law)
    const mulawBuffer = Buffer.from(base64Audio, 'base64');

    // Convert μ-law to linear PCM16
    const pcm16Samples: number[] = [];
    for (let i = 0; i < mulawBuffer.length; i++) {
      const byte = mulawBuffer[i];
      if (byte !== undefined) {
        pcm16Samples.push(mulawToLinear(byte));
      }
    }

    // Upsample from 8kHz to 24kHz (repeat each sample 3 times)
    const upsampled: number[] = [];
    for (let i = 0; i < pcm16Samples.length; i++) {
      const sample = pcm16Samples[i]!;
      upsampled.push(sample);
      upsampled.push(sample);
      upsampled.push(sample);
    }

    // Convert to buffer (PCM16 is 2 bytes per sample, little-endian)
    const pcm16Buffer = Buffer.alloc(upsampled.length * 2);
    for (let i = 0; i < upsampled.length; i++) {
      pcm16Buffer.writeInt16LE(upsampled[i]!, i * 2);
    }

    // Return as base64
    return pcm16Buffer.toString('base64');
  } catch (error) {
    console.error('[AudioUtils] Twilio->Grok conversion error:', error);
    return base64Audio; // Return original if conversion fails
  }
}

/**
 * Convert Grok PCM16 24kHz to Twilio μ-law 8kHz
 *
 * @param base64Audio - Base64 encoded PCM16 audio from Grok
 * @returns Base64 encoded μ-law audio for Twilio
 */
export function convertGrokToTwilio(base64Audio: string): string {
  try {
    // Decode base64 to buffer
    const pcm16Buffer = Buffer.from(base64Audio, 'base64');

    // PCM16 is 16-bit (2 bytes per sample)
    const samples: number[] = [];
    for (let i = 0; i < pcm16Buffer.length; i += 2) {
      samples.push(pcm16Buffer.readInt16LE(i));
    }

    // Downsample from 24kHz to 8kHz (take every 3rd sample)
    const downsampled: number[] = [];
    for (let i = 0; i < samples.length; i += 3) {
      const sample = samples[i];
      if (sample !== undefined) {
        downsampled.push(sample);
      }
    }

    // Convert to μ-law
    const mulawBuffer = Buffer.alloc(downsampled.length);
    for (let i = 0; i < downsampled.length; i++) {
      mulawBuffer[i] = linearToMulaw(downsampled[i]!);
    }

    // Return as base64
    return mulawBuffer.toString('base64');
  } catch (error) {
    console.error('[AudioUtils] Grok->Twilio conversion error:', error);
    return base64Audio; // Return original if conversion fails
  }
}
