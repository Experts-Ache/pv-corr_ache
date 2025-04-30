import React, { useState, useEffect, useCallback, useMemo } from "react";
import { Theme } from "../../types/theme";
import { Language, useTranslation } from "../../types/language";
import { ChevronDown, ChevronRight, AlertTriangle, AlertCircle, CheckCircle, Info } from "lucide-react";
import { Datapoint } from "../../types/projects";
import { supabase } from "../../lib/supabase";
import { showToast } from "../../lib/toast";
import { Table, TableBody, TableCaption, TableCell, TableHead, TableHeader, TableRow } from "../ui/table";
import { Button } from "../ui/button";
import { isObject } from "@/utils/cases";
import { CalculationResult, createErrorResult, createSuccessResult } from "@/types/calculations";
import { formatOutput as formatOutputUtil } from "../../utils/formatOutput";

interface AnalyseResultProps {
  currentTheme: Theme;
  currentLanguage: Language;
  selectedDatapoints: Datapoint[];
  selectedNorm: any;
  project: Project;
  zone: Zone;
}

const AnalyseResult: React.FC<AnalyseResultProps> = ({
  currentTheme,
  currentLanguage,
  selectedDatapoints,
  selectedNorm,
  project,
  zone,
}) => {
  // Move all hooks to the top level and ensure they're called unconditionally
  const t = useTranslation(currentLanguage);
  const [expandedMetadata, setExpandedMetadata] = useState<Set<string>>(new Set());
  const [initializing, setInitializing] = useState(true);
  const [expandedDatapoints, setExpandedDatapoints] = useState<Set<string>>(new Set());
  const [parameters, setParameters] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [normParameters, setNormParameters] = useState<Map<string, string>>(new Map());
  const [error, setError] = useState<string | null>(null);
  const [parameterMap, setParameterMap] = useState<Record<string, any>>({});
  const [navigating, setNavigating] = useState(false);
  const [calculationResults, setCalculationResults] = useState<Record<string, CalculationResult | any>>({});

  // Memoize toggle functions
  const toggleDatapoint = useCallback((id: string) => {
    setExpandedDatapoints((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }, []);

  const toggleMetadata = useCallback((outputId: string) => {
    setExpandedMetadata((prev) => {
      const next = new Set(prev);
      if (next.has(outputId)) {
        next.delete(outputId);
      } else {
        next.add(outputId);
      }
      return next;
    });
  }, []);

  // Memoize formatOutput function to prevent unnecessary re-renders
  const formatOutput = useCallback(
    (output: any, outputId: string): React.ReactNode => {
      if (!output) return <span className="text-muted-foreground">No data</span>;

      if (typeof output === "object" && "success" in output) {
        const result = output as CalculationResult;

        if (!result.success) {
          return (
            <div className="text-destructive">
              {result.errors && result.errors.length > 0 && (
                <div className="text-xs">
                  {result.errors.map((error, i) => (
                    <div key={i}>{error}</div>
                  ))}
                </div>
              )}
              {result.metadata && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="mt-1 text-xs h-6 px-2"
                  onClick={(e) => {
                    e.stopPropagation();
                    toggleMetadata(outputId);
                  }}
                >
                  {expandedMetadata.has(outputId) ? "Hide details" : "Show details"}
                </Button>
              )}
              {expandedMetadata.has(outputId) && result.metadata && (
                <pre className="mt-1 text-xs p-2 bg-muted/20 rounded overflow-auto max-h-32">
                  {JSON.stringify(result.metadata, null, 2)}
                </pre>
              )}
            </div>
          );
        }
        return (
          <div className="font-medium">
            {result.value !== undefined ? result.value : ""}
            {result.message && <div className="text-xs font-normal text-muted-foreground">{result.message}</div>}
            {result.warnings && result.warnings.length > 0 && (
              <div className="text-xs font-normal text-yellow-500">
                {result.warnings.map((warning, i) => (
                  <div key={i} className="flex items-start gap-1">
                    <AlertTriangle size={12} className="mt-0.5 flex-shrink-0" />
                    <span>{warning}</span>
                  </div>
                ))}
              </div>
            )}
            {result.metadata && (
              <Button
                variant="ghost"
                size="sm"
                className="mt-1 text-xs h-6 px-2"
                onClick={(e) => {
                  e.stopPropagation();
                  toggleMetadata(outputId);
                }}
              >
                {expandedMetadata.has(outputId) ? "Hide details" : "Show details"}
              </Button>
            )}
            {expandedMetadata.has(outputId) && result.metadata && (
              <pre className="mt-1 text-xs p-2 bg-muted/20 rounded overflow-auto max-h-32">{JSON.stringify(result.metadata, null, 2)}</pre>
            )}
          </div>
        );
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

      // Handle object with value/sufficient properties (legacy format)
      if (isObject(output) && "value" in output) {
        return (
          <div className="font-medium">
            {output.value}
            {"sufficient" in output && (
              <div className={`text-xs font-normal ${output.sufficient ? "text-green-500" : "text-destructive"}`}>
                {output.sufficient ? (
                  <div className="flex items-center gap-1">
                    <CheckCircle size={12} />
                    <span>Sufficient</span>
                  </div>
                ) : (
                  <div className="flex items-center gap-1">
                    <AlertTriangle size={12} />
                    <span>Insufficient</span>
                  </div>
                )}
              </div>
            )}
            {"message" in output && <div className="text-xs font-normal text-muted-foreground">{output.message}</div>}
          </div>
        );
      }

      // Default case: stringify the output
      return String(output);
    },
    [expandedMetadata, toggleMetadata],
  );

  // Initialize norm parameters
  useEffect(() => {
    const initNormParameters = () => {
      try {
        if (!selectedNorm) {
          setError("No norm selected. Please select a valid norm.");
          setLoading(false);
          return;
        }

        if (!selectedNorm.parameters || !Array.isArray(selectedNorm.parameters)) {
          setError("Invalid norm structure. The norm parameters are missing or invalid.");
          setLoading(false);
          return;
        }

        const paramMap = new Map();
        selectedNorm.parameters.forEach((p: any) => {
          paramMap.set(p.parameter_id, p.parameter_code);
        });
        setNormParameters(paramMap);

        setTimeout(() => {
          setInitializing(false);
        }, 100);
      } catch (err) {
        console.error("Error initializing norm parameters:", err);
        setError("Failed to initialize norm parameters");
        setLoading(false);
      }
    };

    initNormParameters();
  }, [selectedNorm]);

  // Load parameters
  useEffect(() => {
    const loadParameters = async () => {
      try {
        setLoading(true);
        const { data, error } = await supabase
          .from("parameters")
          .select(
            `
            id,
            name,
            short_name,
            unit,
            rating_logic_code
          `,
          )
          .order("created_at", { ascending: true });

        if (error) throw error;

        if (!data || !Array.isArray(data)) {
          throw new Error("Invalid parameters data received");
        }

        setParameters(data);
        const map = data.reduce((acc: Record<string, any>, param: any) => {
          acc[param.id] = param;
          return acc;
        }, {});
        setParameterMap(map);
      } catch (err) {
        console.error("Error loading parameters:", err);
        setError("Failed to load parameters: " + (err instanceof Error ? err.message : String(err)));
      } finally {
        setLoading(false);
      }
    };

    loadParameters();
  }, []);

  // Calculate results
  useEffect(() => {
    if (!selectedDatapoints?.length || !selectedNorm || !parameterMap || Object.keys(parameterMap).length === 0) {
      return;
    }

    const newCalculationResults: Record<string, any> = {};

    for (const datapoint of selectedDatapoints) {
      if (!datapoint || !datapoint.id) continue;

      const zRatings: Record<number, number> = {};

      if (datapoint.ratings) {
        Object.entries(datapoint.ratings).forEach(([paramId, rating]) => {
          const param = parameterMap[paramId];
          if (!param) return;

          const paramCode = normParameters.get(paramId) || param.short_name || param.name;
          if (!paramCode) return;

          const match = paramCode.match(/^Z(\d+)$/i);
          if (!match) return;

          const num = parseInt(match[1]);
          if (num >= 1 && num <= 15) {
            zRatings[num] = rating;
          }
        });
      }

      const b0Value = Object.entries(zRatings).reduce((sum, [num, rating]) => {
        if (parseInt(num) <= 10) {
          return sum + rating;
        }
        return sum;
      }, 0);

      const b1Value =
        b0Value +
        Object.entries(zRatings).reduce((sum, [num, rating]) => {
          if (parseInt(num) > 10 && parseInt(num) <= 15) {
            return sum + rating;
          }
          return sum;
        }, 0);

      newCalculationResults[`${datapoint.id}_b0`] = createSuccessResult(b0Value, "", "Sum of Z1-Z10 parameters", undefined, { zRatings });

      newCalculationResults[`${datapoint.id}_b1`] = createSuccessResult(b1Value, "", "Sum of all Z parameters (Z1-Z15)", undefined, {
        zRatings,
      });

      if (selectedNorm?.output_config && Array.isArray(selectedNorm.output_config)) {
        for (const output of selectedNorm.output_config) {
          if (output && output.id && output.formula) {
            try {
              const context: Record<string, any> = {
                values: {},
                ratings: {},
              };

              Object.entries(datapoint.values || {}).forEach(([paramId, value]) => {
                const param = parameterMap[paramId];
                if (param?.short_name || param?.name) {
                  let numValue = value;
                  if (typeof value === "string" && !isNaN(parseFloat(value))) {
                    numValue = parseFloat(value);
                  }
                  context.values[param.id] = numValue;
                }
              });

              Object.entries(zRatings).forEach(([num, rating]) => {
                context[`Z${num}`] = rating;
              });

              if (datapoint.ratings) {
                Object.entries(datapoint.ratings).forEach(([paramId, rating]) => {
                  const param = parameterMap[paramId];
                  if (param?.short_name) {
                    context.ratings[param.short_name] = rating;
                  }
                });
              }

              let formula = output.formula.trim();
              if (!formula.startsWith("return ") && !formula.includes("return ")) {
                formula = `return ${formula}`;
              }

              try {
                const calculateOutput = new Function("values", "ratings", formula);
                const result = calculateOutput(context.values, context.ratings);

                if (isObject(result) && "success" in result) {
                  newCalculationResults[`${datapoint.id}_${output.id}`] = result;
                } else {
                  newCalculationResults[`${datapoint.id}_${output.id}`] = createSuccessResult(result, output.unit, undefined, undefined, {
                    formula,
                    context,
                  });
                }
              } catch (calcError) {
                console.error(`Error executing calculation for ${output.id}:`, calcError);
                newCalculationResults[`${datapoint.id}_${output.id}`] = createErrorResult(
                  [`Calculation error: ${calcError instanceof Error ? calcError.message : String(calcError)}`],
                  { formula, context, error: calcError },
                );
              }
            } catch (err) {
              console.error(`Error calculating output ${output.id}:`, err);
              newCalculationResults[`${datapoint.id}_${output.id}`] = createErrorResult(
                [`Calculation error: ${err instanceof Error ? err.message : String(err)}`],
                { error: err },
              );
            }
          }
        }
      }
    }

    setCalculationResults(newCalculationResults);
  }, [selectedDatapoints, selectedNorm, parameterMap, normParameters]);

  // Memoize results calculation
  const results = useMemo(() => {
    if (!selectedDatapoints || !calculationResults || !parameterMap) {
      return [];
    }

    return selectedDatapoints.map((datapoint) => {
      const parameterRatings: Record<string, { value: string; rating: number; unit?: string }> = {};

      if (!datapoint.values) {
        console.warn("Datapoint has no values:", datapoint);
        return { datapoint, parameterRatings: {}, outputs: {}, classification: { class: "N/A", stress: "No data" } };
      }

      Object.entries(datapoint.values || {})
        .filter(([paramId]) => normParameters.has(paramId))
        .forEach(([paramId, value]) => {
          const parameter = parameterMap[paramId];
          if (!parameter) {
            console.warn(`Parameter ${paramId} not found in parameter map`);
            return;
          }

          const paramCode = normParameters.get(paramId) || parameter.shortName || parameter.name;

          let rating = 0;
          if (parameter.rating_logic_code) {
            try {
              const calculateRating = new Function("value", parameter.rating_logic_code);
              rating = calculateRating(value);
            } catch (err) {
              console.error(`Error calculating rating for parameter ${parameter.shortName || parameter.name}:`, err);
            }
          } else {
            rating = (datapoint.ratings && datapoint.ratings[paramId]) || 0;
          }

          parameterRatings[paramCode] = {
            value,
            rating,
            unit: parameter.unit,
          };
        });

      const b0Output = calculationResults[`${datapoint.id}_b0`];
      const b0 = b0Output?.value ?? 0;

      const classification =
        b0 >= 0
          ? { class: "Ia", stress: t("analysis.stress.very_low") }
          : b0 >= -4
            ? { class: "Ib", stress: t("analysis.stress.low") }
            : b0 >= -10
              ? { class: "II", stress: t("analysis.stress.medium") }
              : { class: "III", stress: t("analysis.stress.high") };

      return {
        datapoint,
        parameterRatings,
        outputs: calculationResults,
        classification,
      };
    });
  }, [selectedDatapoints, calculationResults, parameterMap, normParameters, t]);

  if (loading || initializing) {
    return <div className="text-center p-4 text-secondary">{t("analysis.loading")}</div>;
  }

  if (error) {
    return (
      <div className="p-4 rounded text-destructive border border-destructive bg-destructive/10">
        <div className="flex items-center gap-2">
          <AlertCircle size={16} />
          <span>{error}</span>
        </div>
      </div>
    );
  }

  if (!selectedNorm) {
    return <div className="p-4 rounded border border-input bg-card">{t("analysis.no_norm_selected")}</div>;
  }

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-medium mb-4">{t("analysis.results")}</h3>

      <div className="space-y-4">
        {results.map(({ datapoint, parameterRatings, outputs, classification }) => (
          <div key={datapoint.id} className="p-4 rounded-lg border border-theme">
            <div className="flex flex-col gap-1 mb-3">
              <div className="flex items-center justify-between cursor-pointer" onClick={() => toggleDatapoint(datapoint.id)}>
                <div className="font-medium text-primary">
                  <span className="font-medium">{t("datapoints")}: </span> {datapoint.name}
                </div>
                <div></div>
                <div className="flex items-center gap-4">
                  <div className="text-sm text-muted-foreground">
                    <span className="font-medium">{t("Created")}:</span>{" "}
                    {datapoint.timestamp ? new Date(datapoint.timestamp).toLocaleString() : "No date"}
                  </div>
                  {expandedDatapoints.has(datapoint.id) ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                </div>
              </div>
            </div>

            <div className="flex flex-col gap-4">
              <Table>
                <TableCaption>{t("analysis.calculation_results")}</TableCaption>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t("analysis.parameter")}</TableHead>
                    <TableHead>{t("analysis.value")}</TableHead>
                    <TableHead>{t("analysis.status")}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {Array.isArray(selectedNorm?.output_config) &&
                    selectedNorm.output_config.map((output: any) => {
                      if (!output || !output.id) return null;

                      // Get the output result
                      const outputResult = outputs[output.id];
                      const isError = outputs[`${output.id}_error`];

                      // Determine status based on output
                      let statusElement;
                      if (outputResult && !outputResult.success) {
                        statusElement = (
                          <div className="flex items-center gap-1 text-destructive">
                            <AlertCircle size={14} />
                            <span>Error</span>
                          </div>
                        );
                      } else if (output.id === "b0") {
                        statusElement = (
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
                        );
                      } else if (
                        outputResult &&
                        typeof outputResult === "object" &&
                        "warnings" in outputResult &&
                        outputResult.warnings?.length > 0
                      ) {
                        statusElement = (
                          <div className="flex items-center gap-1 text-yellow-600">
                            <AlertTriangle size={14} />
                            <span>Warning</span>
                          </div>
                        );
                      } else {
                        statusElement = (
                          <div className="flex items-center gap-1 text-green-600">
                            <CheckCircle size={14} />
                            <span>OK</span>
                          </div>
                        );
                      }

                      return (
                        <TableRow key={output.id} className="hover:bg-muted/10">
                          <TableCell className="font-medium whitespace-nowrap">
                            {output.name}
                            {output.description && <div className="text-xs text-muted-foreground">{output.description}</div>}
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <div className="flex-1">
                                {formatOutput(calculationResults[`${datapoint.id}_${output.id}`], `${datapoint.id}_${output.id}`)}
                                {output.unit && outputResult?.success !== false && (
                                  <span className="text-muted-foreground ml-1 text-xs whitespace-nowrap">[{output.unit}]</span>
                                )}
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>{statusElement}</TableCell>
                        </TableRow>
                      );
                    })}
                </TableBody>
              </Table>

              {expandedDatapoints.has(datapoint.id) && (
                <Table>
                  <TableCaption>{t("analysis.parameter_ratings")}</TableCaption>
                  <TableHeader>
                    <TableRow>
                      <TableHead>{t("analysis.parameter")}</TableHead>
                      <TableHead>{t("analysis.value")}</TableHead>
                      <TableHead>{t("analysis.rating")}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {Object.entries(parameterRatings)
                      .sort(([a], [b]) => a.localeCompare(b))
                      .map(([code, { value, rating, unit }]) => (
                        <TableRow key={code}>
                          <TableCell className="p-2">{code.toUpperCase()}</TableCell>
                          <TableCell className="p-2">
                            {value} {unit && <span className="text-muted-foreground ml-1">[{unit}]</span>}
                          </TableCell>
                          <TableCell className="p-2">{rating}</TableCell>
                        </TableRow>
                      ))}
                  </TableBody>
                </Table>
              )}

              {(!selectedNorm?.output_config || !Array.isArray(selectedNorm.output_config) || selectedNorm.output_config.length === 0) && (
                <Table>
                  <TableCaption>{t("analysis.calculation_results")}</TableCaption>
                  <TableHeader>
                    <TableRow>
                      <TableHead>{t("analysis.parameter")}</TableHead>
                      <TableHead>{t("analysis.value")}</TableHead>
                      <TableHead>{t("analysis.status")}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    <TableRow>
                      <TableCell className="font-medium">
                        B0
                        <div className="text-xs text-muted-foreground">Sum of Z1-Z10 parameters</div>
                      </TableCell>
                      <TableCell>{formatOutput(outputs[`${datapoint.id}_b0`], `${datapoint.id}_b0`)}</TableCell>
                      <TableCell>
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
                      </TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell className="font-medium">
                        B1
                        <div className="text-xs text-muted-foreground">Sum of all Z parameters (Z1-Z15)</div>
                      </TableCell>
                      <TableCell>{formatOutput(outputs[`${datapoint.id}_b1`], `${datapoint.id}_b1`)}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1 text-green-600">
                          <CheckCircle size={14} />
                          <span>OK</span>
                        </div>
                      </TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default AnalyseResult;