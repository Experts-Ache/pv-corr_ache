import React from "react";
import { CalculationResult } from "../../types/calculations";
import { AlertCircle, AlertTriangle, CheckCircle, Info } from "lucide-react";

interface CalculationResultDisplayProps {
  result: CalculationResult;
  showMetadata?: boolean;
  toggleMetadata?: () => void;
}

const CalculationResultDisplay: React.FC<CalculationResultDisplayProps> = ({ result, showMetadata = false, toggleMetadata }) => {
  if (!result.success) {
    return (
      <div>
        <div className="text-destructive flex items-center gap-1">
          <AlertCircle size={14} />
          <span>Calculation failed</span>
        </div>
        {result.errors && result.errors.length > 0 && (
          <div className="mt-1 text-xs text-destructive">
            {result.errors.map((error, i) => (
              <div key={i} className="flex items-start gap-1">
                <AlertCircle size={12} className="mt-0.5 flex-shrink-0" />
                <span>{error}</span>
              </div>
            ))}
          </div>
        )}
        {result.metadata && toggleMetadata && (
          <button className="mt-1 text-xs px-2 py-1 rounded hover:bg-muted/50" onClick={toggleMetadata}>
            {showMetadata ? "Hide details" : "Show details"}
          </button>
        )}
        {showMetadata && result.metadata && (
          <pre className="mt-1 text-xs p-2 bg-muted/20 rounded overflow-auto max-h-32">{JSON.stringify(result.metadata, null, 2)}</pre>
        )}
      </div>
    );
  }

  return (
    <div>
      {result.value !== undefined && (
        <div className="font-medium">
          {result.value}
          {result.unit && <span className="ml-1 text-muted-foreground">{result.unit}</span>}
        </div>
      )}
      {result.message && <div className="text-xs text-muted-foreground">{result.message}</div>}
      {result.warnings && result.warnings.length > 0 && (
        <div className="mt-1 text-xs text-yellow-500">
          {result.warnings.map((warning, i) => (
            <div key={i} className="flex items-start gap-1">
              <AlertTriangle size={12} className="mt-0.5 flex-shrink-0" />
              <span>{warning}</span>
            </div>
          ))}
        </div>
      )}
      {result.metadata && toggleMetadata && (
        <button className="mt-1 text-xs px-2 py-1 rounded hover:bg-muted/50" onClick={toggleMetadata}>
          {showMetadata ? "Hide details" : "Show details"}
        </button>
      )}
      {showMetadata && result.metadata && (
        <pre className="mt-1 text-xs p-2 bg-muted/20 rounded overflow-auto max-h-32">{JSON.stringify(result.metadata, null, 2)}</pre>
      )}
    </div>
  );
};

export default CalculationResultDisplay;
