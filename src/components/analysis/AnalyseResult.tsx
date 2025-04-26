import React, { useState, useEffect } from "react";
import { Theme } from "../../types/theme";
import { Language, useTranslation } from "../../types/language";
import { FileText, ChevronDown, ChevronRight, FileCheck } from "lucide-react";
import { Datapoint } from "../../types/projects";
import { supabase } from "../../lib/supabase";
import { showToast } from "../../lib/toast";
import { Table, TableBody, TableCaption, TableCell, TableHead, TableHeader, TableRow } from "../ui/table";
import { Button } from "../ui/button";
import { isObject } from "@/utils/cases";

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
  const t = useTranslation(currentLanguage);
  const [initializing, setInitializing] = useState(true);
  const [expandedDatapoints, setExpandedDatapoints] = useState<Set<string>>(new Set());
  const [parameters, setParameters] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [normParameters, setNormParameters] = useState<Map<string, string>>(new Map());
  const [error, setError] = useState<string | null>(null);
  const [parameterMap, setParameterMap] = useState<Record<string, any>>({});
  const [navigating, setNavigating] = useState(false);

  useEffect(() => {
    try {
      // Safety check for selectedNorm
      if (!selectedNorm) {
        setError("No norm selected. Please select a valid norm.");
        setLoading(false);
        return;
      }

      // Validate selectedNorm structure
      if (!selectedNorm.parameters || !Array.isArray(selectedNorm.parameters)) {
        setError("Invalid norm structure. The norm parameters are missing or invalid.");
        setLoading(false);
        return;
      }

      // Create set of parameter IDs from norm
      const paramMap = new Map();
      selectedNorm.parameters.forEach((p: any) => {
        paramMap.set(p.parameter_id, p.parameter_code);
      });
      setNormParameters(paramMap);

      // Initialize with a short delay to ensure all data is loaded
      setTimeout(() => {
        setInitializing(false);
      }, 100);
    } catch (err) {
      console.error("Error initializing norm parameters:", err);
      setError("Failed to initialize norm parameters");
      setLoading(false);
    }
  }, [selectedNorm]);

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

        // Create parameter map for easier lookup
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

  const toggleDatapoint = (id: string) => {
    setExpandedDatapoints((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  // Show loading state while initializing or loading parameters
  if (loading || initializing) {
    return <div className="text-center p-4 text-secondary">{t("analysis.loading")}</div>;
  }

  // Show error if there's an issue
  if (error) {
    return <div className="p-4 rounded text-accent-primary border-accent-primary border-solid bg-surface">{error}</div>;
  }

  // Safety check for selectedNorm
  if (!selectedNorm) {
    return (
      <div className="p-4 rounded text-accent-primary border-accent-primary border-solid bg-surface">{t("analysis.no_norm_selected")}</div>
    );
  }

  // Calculate results for each datapoint
  const results = selectedDatapoints.map((datapoint) => {
    // Calculate ratings for each parameter
    const parameterRatings: Record<string, { value: string; rating: number; unit?: string }> = {};

    if (!datapoint.values) {
      console.warn("Datapoint has no values:", datapoint);
      return { datapoint, parameterRatings: {}, outputs: {}, classification: { class: "N/A", stress: "No data" } };
    }

    // Process each parameter in the datapoint values
    Object.entries(datapoint.values || {})
      .filter(([paramId]) => normParameters.has(paramId))
      .forEach(([paramId, value]) => {
        const parameter = parameterMap[paramId];
        if (!parameter) {
          console.warn(`Parameter ${paramId} not found in parameter map`);
          return;
        }

        const paramCode = normParameters.get(paramId) || parameter.shortName || parameter.name;

        // Execute rating logic code if available
        let rating = 0;
        if (parameter.rating_logic_code) {
          try {
            // Create a function from the rating logic code
            const calculateRating = new Function("value", parameter.rating_logic_code);
            rating = calculateRating(value);
          } catch (err) {
            console.error(`Error calculating rating for parameter ${parameter.shortName || parameter.name}:`, err);
          }
        } else {
          // If no rating logic code, use the datapoint's rating if available
          rating = (datapoint.ratings && datapoint.ratings[paramId]) || 0;
        }

        parameterRatings[paramCode] = {
          value,
          rating,
          unit: parameter.unit,
        };
      });

    // Initialize outputs object
    const outputs: Record<string, number> = {};

    // Get all ratings for parameters Z1-Z15
    const zRatings: Record<number, number> = {};

    // Process each parameter rating
    if (datapoint.ratings) {
      Object.entries(datapoint.ratings).forEach(([paramId, rating]) => {
        // Get parameter info from map
        const param = parameterMap[paramId];
        if (!param) return;

        const paramCode = normParameters.get(paramId) || param.shortName || param.name;
        if (!paramCode) return;

        // Match Z1-Z15 pattern
        const match = paramCode.match(/^Z(\d+)$/i);
        if (!match) return;

        const num = parseInt(match[1]);
        if (num >= 1 && num <= 15) {
          zRatings[num] = rating;
        }
      });
    }

    // Process each output formula from the norm configuration
    if (selectedNorm?.output_config && Array.isArray(selectedNorm.output_config)) {
      console.log("Processing output config:", selectedNorm.output_config);
      selectedNorm.output_config.forEach((output: any) => {
        if (output && output.id && output.formula) {
          try {
            // Create a context with parameter values and ratings
            const context: Record<string, any> = {
              values: {},
              ratings: {},
            };

            // Add all parameter values to the context
            Object.entries(datapoint.values || {}).forEach(([paramId, value]) => {
              const param = parameterMap[paramId];
              if (param?.short_name || param?.name) {
                // Convert string numbers to actual numbers
                let numValue = value;
                if (typeof value === "string" && !isNaN(parseFloat(value))) {
                  numValue = parseFloat(value);
                }
                console.log(`Setting context value ${param.short_name || param.name} = ${numValue}`);
                context.values[param.id] = numValue;
              }
            });

            // Add all parameter ratings to the context
            if (datapoint.ratings) {
              Object.entries(datapoint.ratings).forEach(([paramId, rating]) => {
                const param = parameterMap[paramId];
                if (param?.short_name) {
                  console.log(`Setting context rating ${param.short_name} = ${rating}`);
                  context.ratings[param.short_name] = rating;
                }
              });
            }

            // Add Z1-Z15 ratings directly to the context for easier access
            Object.entries(zRatings).forEach(([num, rating]) => {
              console.log(`Setting Z${num} = ${rating}`);
              context[`Z${num}`] = rating;
            });

            // Create a function from the formula and execute it with the context
            try {
              // Wrap the formula in a return statement if it doesn't have one
              let formula = output.formula.trim();
              if (!formula.startsWith("return ") && !formula.includes("return ")) {
                formula = `return ${formula}`;
              }

              try {
                const calculateOutput = new Function("values", "ratings", formula);
                const result = calculateOutput(context.values, context.ratings);
                console.log(`Executing formula for output ${output.id}:`, formula);
                console.log("Context values:", context.values);
                console.log("Context ratings:", context.ratings);
                console.log("Result:", result);

                if (isObject(result)) {
                  outputs[`${output.id}_error`] = result;
                }

                // Handle array results (like zinc loss rate)
                if (Array.isArray(result)) {
                  // Store the first value for display purposes
                  outputs[output.id] = result[0];
                  // Store the full array for detailed calculations
                  outputs[`${output.id}_full`] = result;
                } else {
                  outputs[output.id] = result;
                }
              } catch (calcError) {
                console.error(`Error executing calculation for ${output.id}:`, calcError);
                outputs[output.id] = 0;
              }
              console.log(`Output ${output.id} = ${outputs[output.id]}`);
            } catch (err) {
              console.error(`Error executing formula for output ${output.id}:`, err);
              outputs[output.id] = 0; // Default to 0 on error
            }
          } catch (err) {
            console.error(`Error calculating output ${output.id}:`, err);
            outputs[output.id] = 0; // Default to 0 on error
          }
        }
      });
    } else {
      // Fallback to default calculations if no output_config is available
      console.log("Using fallback calculations");
      // Calculate B0 (sum of Z1-Z10)
      outputs.b0 = Object.entries(zRatings).reduce((sum, [num, rating]) => {
        if (parseInt(num) <= 10) {
          console.log(`Adding Z${num} (${rating}) to B0`);
          return sum + rating;
        }
        return sum;
      }, 0);
      console.log("Calculated B0:", outputs.b0);

      // Calculate B1 (B0 + sum of Z11-Z15)
      outputs.b1 =
        outputs.b0 +
        Object.entries(zRatings).reduce((sum, [num, rating]) => {
          if (parseInt(num) > 10 && parseInt(num) <= 15) {
            console.log(`Adding Z${num} (${rating}) to B1`);
            return sum + rating;
          }
          return sum;
        }, 0);
      console.log("Calculated B1:", outputs.b1);
    }

    // Get B0 value for classification
    const b0 = outputs.b0 || 0;
    console.log("Final B0 value for classification:", b0);

    // Classify results
    const classification =
      b0 >= 0
        ? { class: "Ia", stress: t("analysis.stress.very_low") }
        : b0 >= -4
          ? { class: "Ib", stress: t("analysis.stress.low") }
          : b0 >= -10
            ? { class: "II", stress: t("analysis.stress.medium") }
            : { class: "III", stress: t("analysis.stress.high") };
    console.log("Classification:", classification);

    return {
      datapoint,
      parameterRatings,
      outputs,
      classification,
    };
  });

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
                <div>
                  {Array.isArray(selectedNorm?.output_config) &&
                    selectedNorm.output_config.map(
                      (output: any) =>
                        output &&
                        output.id && (
                          <span
                            key={output.id}
                            className="text-sm px-3 py-1 rounded bg-opacity-20 bg-border empty:hidden "
                            title={output.description}
                          >
                            {outputs[`${output.id}_error`] && (
                              <span className="text-muted-foreground ml-1">{outputs[`${output.id}_error`]?.message}</span>
                            )}
                          </span>
                        ),
                    )}
                </div>
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
              <div className="flex flex-wrap items-center gap-3">
                {Array.isArray(selectedNorm?.output_config) &&
                  selectedNorm.output_config.map(
                    (output: any) =>
                      output &&
                      output.id && (
                        <div key={output.id} className="text-sm px-3 py-1 rounded bg-opacity-20 bg-border" title={output.description}>
                          <span className="font-medium">{output.name}:</span>{" "}
                          {(() => {
                            // Special handling for array outputs like zinc loss rate
                            if (Array.isArray(outputs[`${output.id}_full`])) {
                              return `${outputs[`${output.id}_full`][0]} ± ${outputs[`${output.id}_full`][1]}${output.unit ? ` ${output.unit}` : ""}`;
                            } else if (output.id === "zincLossRate" && Array.isArray(outputs[output.id])) {
                              return `${outputs[output.id][0]} ± ${outputs[output.id][1]}${output.unit ? ` ${output.unit}` : ""}`;
                            } else if (typeof outputs[output.id] === "number") {
                              return `${outputs[output.id].toFixed(2)}${output.unit ? ` ${output.unit}` : ""}`;
                            } else {
                              return `0.00${output.unit ? ` ${output.unit}` : ""}`;
                            }
                          })()}
                          {output.id === "b0" && ` (${classification.class} - ${classification.stress})`}
                          <span className="text-muted-foreground ml-1"></span>
                        </div>
                      ),
                  )}
              </div>

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
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default AnalyseResult;
