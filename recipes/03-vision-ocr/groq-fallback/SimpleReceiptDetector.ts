/**
 * Simple Receipt Detector
 * 
 * Classifies receipts as "simple" or "complex" using heuristics.
 * Simple receipts → Groq (cheap)
 * Complex receipts → Claude (accurate)
 */

import type { ReceiptClassification } from './types';

export class SimpleReceiptDetector {
  private config: {
    brightnessThreshold: number;
    textDensityThreshold: number;
    minConfidence: number;
  };

  constructor(config?: Partial<typeof SimpleReceiptDetector.prototype.config>) {
    this.config = {
      brightnessThreshold: 0.6,
      textDensityThreshold: 0.4,
      minConfidence: 0.85,
      ...config,
    };
  }

  /**
   * Classify receipt image
   * 
   * @param imageBase64 - Base64-encoded image
   * @returns Classification result
   */
  async classify(imageBase64: string): Promise<ReceiptClassification> {
    // In a real implementation, this would:
    // 1. Decode image
    // 2. Analyze brightness/contrast
    // 3. Detect text regions
    // 4. Check for standard templates (7-11, Tesco, etc.)
    
    // For this recipe, we'll use simplified heuristics
    const features = await this.extractFeatures(imageBase64);
    
    // Decision logic
    const isSimple = this.evaluateSimplicity(features);
    const confidence = this.calculateConfidence(features);
    
    return {
      isSimple,
      confidence,
      reason: this.generateReason(features, isSimple),
      features,
    };
  }

  /**
   * Extract image features (simplified)
   */
  private async extractFeatures(imageBase64: string) {
    // Mock implementation - In production:
    // - Use image processing library (sharp, jimp)
    // - Calculate actual brightness histogram
    // - Detect text regions with edge detection
    // - Match against known templates
    
    const imageSize = imageBase64.length;
    
    // Heuristic: Larger base64 = higher quality image = likely simple
    const brightness = Math.min(imageSize / 100000, 1);
    
    // Check for common patterns in base64 that indicate standard formats
    const hasStandardFormat = this.detectStandardFormat(imageBase64);
    
    return {
      brightness,
      textDensity: 0.7, // Mock
      hasStandardFormat,
      hasHandwriting: false, // Would need ML model
      hasFading: brightness < 0.5,
    };
  }

  /**
   * Detect standard receipt formats (7-11, Tesco, etc.)
   */
  private detectStandardFormat(imageBase64: string): boolean {
    // In production: Use template matching or ML classifier
    // For now: Simple heuristic based on image characteristics
    
    // Most standard receipts have consistent dimensions
    const aspectRatio = this.estimateAspectRatio(imageBase64);
    
    // Standard receipt aspect ratio: ~1:2 to 1:4 (narrow and tall)
    return aspectRatio > 1.5 && aspectRatio < 4;
  }

  /**
   * Estimate aspect ratio from base64 length
   */
  private estimateAspectRatio(imageBase64: string): number {
    // Mock - in production, decode image and get actual dimensions
    return 2.5; // Assume standard receipt ratio
  }

  /**
   * Evaluate if receipt is simple
   */
  private evaluateSimplicity(features: ReceiptClassification['features']): boolean {
    if (!features) return false;
    
    // Simple if:
    // - Good brightness (clear photo)
    // - Standard format detected
    // - No handwriting
    // - Not faded
    
    return (
      features.brightness > this.config.brightnessThreshold &&
      features.hasStandardFormat &&
      !features.hasHandwriting &&
      !features.hasFading
    );
  }

  /**
   * Calculate confidence score
   */
  private calculateConfidence(features: ReceiptClassification['features']): number {
    if (!features) return 0;
    
    let confidence = 0;
    
    // Brightness contributes 40%
    confidence += features.brightness * 0.4;
    
    // Text density contributes 30%
    confidence += features.textDensity * 0.3;
    
    // Standard format contributes 30%
    confidence += (features.hasStandardFormat ? 1 : 0) * 0.3;
    
    // Penalties
    if (features.hasHandwriting) confidence *= 0.5;
    if (features.hasFading) confidence *= 0.7;
    
    return Math.min(confidence, 1);
  }

  /**
   * Generate human-readable reason
   */
  private generateReason(
    features: ReceiptClassification['features'],
    isSimple: boolean
  ): string {
    if (!features) return 'No features detected';
    
    if (isSimple) {
      return 'Clear, standard format receipt - suitable for Groq parsing';
    }
    
    const reasons: string[] = [];
    
    if (features.brightness < this.config.brightnessThreshold) {
      reasons.push('low brightness');
    }
    if (!features.hasStandardFormat) {
      reasons.push('non-standard format');
    }
    if (features.hasHandwriting) {
      reasons.push('handwritten');
    }
    if (features.hasFading) {
      reasons.push('faded text');
    }
    
    return `Complex receipt (${reasons.join(', ')}) - using Claude Vision`;
  }
}
