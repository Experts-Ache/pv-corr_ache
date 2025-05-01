import { CalculationResult } from "../types/calculations";

/**
 * Formats calculation output for display
 *
 * @param output The calculation output to format
 * @returns Formatted output as a string
 */
export const formatOutput = (output: any): string => {
  // Handle null or undefined output
  if (!output) return "No data";

  // Targeted logging: Check type and value only for calculation results
  if (typeof output === "object" && "success" in output) {
    console.log("Formatting calculation result:", {
      type: typeof output,
      value: output.value,
      success: output.success,
      fullObject: output,
    });
  }

  // Handle calculation result format
  if (typeof output === "object" && "success" in output) {
    const result = output as CalculationResult;

    // Handle error results
    if (!result.success) {
      return "Error";
    }

    // Handle successful results
    if (result.value !== undefined) {
      if (typeof result.value === "number") {
        return result.value.toFixed(2);
      }
      return String(result.value);
    }

    return "";
  }

  // Handle legacy number format
  if (typeof output === "number") {
    return output.toFixed(2);
  }

  // Handle array format (like zinc loss rate)
  if (Array.isArray(output)) {
    if (output.length >= 2) {
      return `${output[0]} ± ${output[1]}`;
    }
    return output.join(", ");
  }

  // Handle object with value property (legacy format)
  if (typeof output === "object" && output !== null && "value" in output) {
    if (typeof output.value === "number") {
      return output.value.toFixed(2);
    }
    return String(output.value);
  }

  // Default case: stringify the output
  return String(output);
};
