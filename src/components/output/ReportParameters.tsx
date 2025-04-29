import React from "react";
import { Info } from "lucide-react";
import { useTranslation } from "../../types/language";

interface ReportParametersProps {
  datapointsToUse: any[];
  parameterDetails: Record<string, { name: string; unit: string }>;
  className?: string;
}

const ReportParameters: React.FC<ReportParametersProps> = ({ 
  datapointsToUse, 
  parameterDetails,
  className = ""
}) => {
  const t = useTranslation("en");
  
  // Check if any datapoint has values
  const hasValues = datapointsToUse.some((dp) => dp?.values && Object.keys(dp.values || {}).length > 0);
  
  if (!datapointsToUse || datapointsToUse.length === 0) {
    return (
      <div className={`mb-8 p-6 rounded-lg border border-input bg-card print:border-black print:border print:p-4 print:page-break-after-avoid ${className}`}>
        <h2 className="text-lg font-medium text-foreground mb-4 print:text-black">{t("analysis.parameters_results")}</h2>
        <div className="p-4 text-center border border-input rounded-md">
          <Info className="mx-auto h-8 w-8 text-muted-foreground mb-2" />
          <p className="text-muted-foreground">No datapoints available for this report</p>
        </div>
      </div>
    );
  }

  if (!hasValues) {
    return (
      <div className={`mb-8 p-6 rounded-lg border border-input bg-card print:border-black print:border print:p-4 print:page-break-after-avoid ${className}`}>
        <h2 className="text-lg font-medium text-foreground mb-4 print:text-black">{t("analysis.parameters_results")}</h2>
        <div className="p-4 text-center border border-input rounded-md">
          <Info className="mx-auto h-8 w-8 text-muted-foreground mb-2" />
          <p className="text-muted-foreground">No parameter values found in selected datapoints</p>
        </div>
      </div>
    );
  }

  return (
    <div className={`mb-8 p-6 rounded-lg border border-input bg-card print:border-black print:border print:p-4 print:page-break-after-avoid ${className}`}>
      <h2 className="text-lg font-medium text-foreground mb-4 print:text-black">{t("analysis.parameters_results")}</h2>
      <div className="space-y-6">
        {datapointsToUse.map((datapoint, index) => (
          <div key={`${datapoint.id}-${index}`} className="mb-6">
            <div className="flex justify-between items-center mb-3">
              <h3 className="text-base font-medium text-foreground print:text-black">{datapoint.name || `Datapoint ${index + 1}`}</h3>
              <div className="text-xs text-muted-foreground print:text-gray-600">
                {Object.values(datapoint.ratings || {}).reduce((sum: number, rating: number) => sum + rating, 0).toFixed(2)}
              </div>
            </div>

            <div className="overflow-x-auto print:border-black print:border print:border-collapse">
              <table className="w-full border-collapse">
                <thead>
                  <tr className="border-b">
                    <th className="p-2 text-left font-medium print:text-black">{t("analysis.parameter")}</th>
                    <th className="p-2 text-left font-medium print:text-black">{t("analysis.value")}</th>
                    <th className="p-2 text-left font-medium print:text-black">{t("analysis.unit")}</th>
                    <th className="p-2 text-left font-medium print:text-black">{t("analysis.rating")}</th>
                  </tr>
                </thead>
                <tbody>
                  {Object.entries(datapoint.values || {}).map(([key, value]) => {
                    const rating = datapoint.ratings?.[key] || 0;
                    const paramDetail = parameterDetails[key] || { 
                      name: key, 
                      unit: "" 
                    };

                    return (
                      <tr key={`${datapoint.id}-${key}`} className="border-b hover:bg-muted/50">
                        <td className="p-2 border border-input print:border-gray-300 print:text-black">
                          {paramDetail.name || key}
                        </td>
                        <td className="p-2 border border-input print:border-gray-300 print:text-black">{value}</td>
                        <td className="p-2 border border-input print:border-gray-300 print:text-black">
                          {paramDetail.unit || "-"}
                        </td>
                        <td className="p-2 border border-input print:border-gray-300 print:text-black">
                          {rating !== undefined ? (
                            <div className="flex items-center gap-2">
                              <div
                                className="w-2 h-2 rounded-full"
                                style={{
                                  backgroundColor: rating >= 0 ? "#22c55e" : "#ef4444",
                                }}
                              />
                              {rating}
                            </div>
                          ) : (
                            <span className="text-muted-foreground">-</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                  <tr className="bg-muted/20">
                    <td
                      colSpan={3}
                      className="p-2 border border-input print:border-gray-300 font-bold print:text-black text-right"
                    >
                      {t("analysis.datapoint_total")}
                    </td>
                    <td className="p-2 border border-input print:border-gray-300 font-bold print:text-black">
                      {Object.values(datapoint.ratings || {}).length > 0
                        ? Object.values(datapoint.ratings || {})
                            .reduce((sum: number, rating: number) => sum + rating, 0)
                            .toFixed(2)
                        : "0.00"}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        ))}

        <div className="mt-6 p-4 border border-input rounded-lg bg-muted/10 print:border-black">
          <div className="flex justify-between items-center">
            <h3 className="text-base font-medium text-foreground print:text-black">{t("analysis.combined_results")}</h3>
            <div className="text-sm font-medium text-foreground print:text-black">
              {t("analysis.total_rating")}: {datapointsToUse.reduce((sum, dp) => {
                return sum + Object.values(dp.ratings || {}).reduce((a: number, b: number) => a + b, 0);
              }, 0).toFixed(2)}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ReportParameters;