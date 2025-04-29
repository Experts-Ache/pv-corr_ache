export interface CalculationResult {
  value?: number | string | boolean;
  unit?: string;
  success: boolean;
  message?: string;
  warnings?: string[];
  errors?: string[];
  metadata?: Record<string, any>;
}

/**
 * Creates a successful calculation result
 */
export function createSuccessResult(
  value: number | string | boolean,
  unit?: string,
  message?: string,
  warnings?: string[],
  metadata?: Record<string, any>,
): CalculationResult {
  return {
    value,
    unit,
    success: true,
    message,
    warnings,
    metadata,
  };
}

/**
 * Creates a failed calculation result
 */
export function createErrorResult(errors: string[], metadata?: Record<string, any>): CalculationResult {
  return {
    success: false,
    errors,
    metadata,
  };
}

/**
 * Creates a warning calculation result
 */
export function createWarningResult(
  value: number | string | boolean,
  unit?: string,
  warnings: string[],
  metadata?: Record<string, any>,
): CalculationResult {
  return {
    value,
    unit,
    success: true,
    warnings,
    metadata,
  };
}

/**
 * Determines if a calculation result contains warnings but is not an error
 */
export function isWarningResult(result: CalculationResult): boolean {
  return result.success && result.warnings !== undefined && result.warnings.length > 0;
}

/**
 * Determines if a calculation result is an error
 */
export function isErrorResult(result: CalculationResult): boolean {
  return !result.success;
}
