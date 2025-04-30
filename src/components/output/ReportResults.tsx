import React from "react";
import { Check, X, AlertTriangle } from "lucide-react";
import { useTranslation } from "../../types/language";
import { formatOutput } from "../../utils/formatOutput";

interface ReportResultsProps {
  totalRating: number;
  classification: { class: string; stress: string };
  normResults?: Record<string, any>;
  calculationResults?: Record<string, any>;
  datapointsToUse: any[];
  project?: any;
  className?: string;
}

const ReportResults: React.FC<ReportResultsProps> = ({
  totalRating,
  classification,
  normResults,
  calculationResults,
  datapointsToUse,
  project,
  className = "",
}) => {
  const t = useTranslation("en");

  // Check if any field in the project is missing earthing
  const missingEarthing = React.useMemo(() => {
    if (!project || !project.fields || !Array.isArray(project.fields)) {
      return false;
    }

    return project.fields.some((field) => !field.has_earthing);
  }, [project]);

  return (
    <div
      className={`mb-8 p-6 rounded-lg border border-input bg-card print:border-black print:border print:p-4 print:page-break-before-avoid ${className}`}
    >
      <h2 className="text-lg font-medium text-foreground mb-4 print:text-black">{t("analysis.final_results")}</h2>

      <div className="space-y-6">
        {/* Calculation Results */}
        {datapointsToUse.length > 0 && (
          <div className="space-y-6">
            {datapointsToUse.map((datapoint) => (
              <div key={datapoint.id} className="border border-input rounded-lg p-4">
                <h3 className="text-base font-medium mb-4">{datapoint.name || "Datapoint"}</h3>

                <table className="w-full border-collapse mb-4">
                  <thead>
                    <tr className="border-b">
                      <th className="p-2 text-left font-medium">Parameter</th>
                      <th className="p-2 text-left font-medium">Value</th>
                      <th className="p-2 text-left font-medium">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {/* B0 Calculation */}
                    <tr className="border-b">
                      <td className="p-2 font-medium">
                        B0
                        <div className="text-xs text-muted-foreground">Sum of Z1-Z10 parameters</div>
                      </td>
                      <td className="p-2">
                        {calculationResults && calculationResults[`${datapoint.id}_b0`]
                          ? formatOutput(calculationResults[`${datapoint.id}_b0`])
                          : Object.values(datapoint.ratings || {})
                              .reduce((sum: number, rating: number) => sum + rating, 0)
                              .toFixed(2)}
                      </td>
                      <td className="p-2">
                        <div className="flex items-center gap-1">
                          <span
                            className={`px-2 py-0.5 rounded text-xs ${
                              classification.class === "Ia"
                                ? "bg-green-500/20 text-green-700"
                                : classification.class === "Ib"
                                  ? "bg-blue-500/20 text-blue-700"
                                  : classification.class === "II"
                                    ? "bg-yellow-500/20 text-yellow-700"
                                    : "bg-red-500/20 text-red-700"
                            }`}
                          >
                            {classification.class} - {classification.stress}
                          </span>
                        </div>
                      </td>
                    </tr>

                    {/* B1 Calculation */}
                    <tr className="border-b">
                      <td className="p-2 font-medium">
                        B1
                        <div className="text-xs text-muted-foreground">Sum of all Z parameters (Z1-Z15)</div>
                      </td>
                      <td className="p-2">
                        {calculationResults && calculationResults[`${datapoint.id}_b1`]
                          ? formatOutput(calculationResults[`${datapoint.id}_b1`])
                          : Object.values(datapoint.ratings || {})
                              .reduce((sum: number, rating: number) => sum + rating, 0)
                              .toFixed(2)}
                      </td>
                      <td className="p-2">
                        <div className="flex items-center gap-1 text-green-600">
                          <Check size={14} />
                          <span>OK</span>
                        </div>
                      </td>
                    </tr>

                    {/* Additional Calculation Results */}
                    {calculationResults &&
                      Object.entries(calculationResults)
                        .filter(([key, _]) => key.startsWith(`${datapoint.id}_`) && !key.endsWith("_b0") && !key.endsWith("_b1"))
                        .map(([key, value]) => {
                          const outputId = key.replace(`${datapoint.id}_`, "");
                          return (
                            <tr key={key} className="border-b">
                              <td className="p-2 font-medium">
                                {outputId.toUpperCase()}
                                {value.message && <div className="text-xs text-muted-foreground">{value.message}</div>}
                              </td>
                              <td className="p-2">
                                {formatOutput(value)}
                                {value.unit && <span className="text-muted-foreground ml-1 text-xs">[{value.unit}]</span>}
                              </td>
                              <td className="p-2">
                                {value.success === false ? (
                                  <div className="flex items-center gap-1 text-destructive">
                                    <AlertTriangle size={14} />
                                    <span>Error</span>
                                  </div>
                                ) : value.warnings && value.warnings.length > 0 ? (
                                  <div className="flex items-center gap-1 text-yellow-600">
                                    <AlertTriangle size={14} />
                                    <span>Warning</span>
                                  </div>
                                ) : (
                                  <div className="flex items-center gap-1 text-green-600">
                                    <Check size={14} />
                                    <span>OK</span>
                                  </div>
                                )}
                              </td>
                            </tr>
                          );
                        })}
                  </tbody>
                </table>

                <div className="text-right text-sm font-medium">Calculation Results</div>
              </div>
            ))}
          </div>
        )}

        <div className="p-6 border border-input rounded-lg">
          <div className="flex justify-between items-center mb-6">
            <div className="space-y-1">
              <div className="text-sm font-medium text-muted-foreground mb-2 print:text-gray-600">{t("analysis.classification")}</div>
              <div className="text-3xl font-bold text-foreground print:text-black">{classification.class}</div>
              <div className="text-sm text-muted-foreground print:text-gray-600">{classification.stress}</div>
            </div>

            <div>
              <div className="text-sm font-medium text-muted-foreground mb-2 print:text-gray-600">{t("analysis.corrosion_risk")}</div>
              <div className="flex items-center gap-2">
                {totalRating >= 0 ? (
                  <>
                    <Check size={20} className="text-green-500" />
                    <span className="text-foreground print:text-black">{t("analysis.risk.low")}</span>
                  </>
                ) : totalRating >= -10 ? (
                  <>
                    <Check size={20} className="text-yellow-500" />
                    <span className="text-foreground print:text-black">{t("analysis.risk.medium")}</span>
                  </>
                ) : (
                  <>
                    <X size={20} className="text-red-500" />
                    <span className="text-foreground print:text-black">{t("analysis.risk.high")}</span>
                  </>
                )}
              </div>
            </div>
          </div>

          <div className="mt-6 pt-6 border-t border-input">
            <h3 className="text-base font-medium mb-3">{t("analysis.recommendations")}</h3>
            <p className="text-muted-foreground">
              {totalRating >= 0
                ? "No special measures required. Standard corrosion protection is sufficient."
                : totalRating >= -10
                  ? "Moderate corrosion protection measures recommended."
                  : "Enhanced corrosion protection measures required."}
            </p>

            {/* Earthing warning */}
            {missingEarthing && (
              <div className="mt-4 p-3 border border-yellow-500/20 bg-yellow-500/10 rounded-md">
                <div className="flex items-start gap-2">
                  <AlertTriangle className="h-5 w-5 text-yellow-500 flex-shrink-0 mt-0.5" />
                  <div>
                    <h4 className="font-medium text-yellow-700 dark:text-yellow-400">
                      {t("field.earthing_warning_title") || "Earthing Connection Warning"}
                    </h4>
                    <p className="text-sm text-yellow-600 dark:text-yellow-300 mt-1">
                      {t("field.earthing_warning_message") ||
                        "One or more fields in this project are missing earthing connections. Proper earthing is essential for safety and protection against electrical faults."}
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Norm-specific results */}
        {normResults && Object.keys(normResults).length > 0 && (
          <div className="mt-6 p-6 border border-input rounded-lg">
            <h3 className="text-base font-medium mb-3">{t("analysis.norm_specific_results")}</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {Object.entries(normResults).map(([key, value]) => (
                <div key={key} className="p-4 border border-input rounded-lg">
                  <div className="text-sm font-medium mb-1">{key}</div>
                  <div className="text-2xl font-bold">{value}</div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ReportResults;
