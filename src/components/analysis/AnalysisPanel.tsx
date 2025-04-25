import React, { useState, useEffect } from "react";
import { Theme } from "../../types/theme";
import { Language, useTranslation } from "../../types/language";
import { Project, Zone } from "../../types/projects";
import { FileText, FileCheck } from "lucide-react";
import AnalysisReport from "./AnalysisReport";
import { generateHiddenId } from "../../utils/generateHiddenId";
import AnalyseData from "./AnalyseData";
import AnalyseNorm from "./AnalyseNorm";
import { showToast, promiseToast } from "../../lib/toast";
import AnalyseResult from "./AnalyseResult";
import { createReport } from "../../services/reports";
import { useNavigate } from "react-router-dom";
import { Button } from "../ui/button";
import { calculateZincLossRate, formatZincLossRate } from "../../services/calculations";
import { supabase } from "../../lib/supabase";
import { fetchDatapointsByZoneId } from "../../services/datapoints";

interface AnalysisPanelProps {
  currentTheme: Theme;
  currentLanguage: Language;
  projects: Project[];
  selectedProjectId?: string;
  selectedFieldId?: string;
  selectedZoneId?: string;
  onBack: () => void;
}

const AnalysisPanel: React.FC<AnalysisPanelProps> = ({
  currentTheme,
  currentLanguage,
  projects,
  selectedProjectId,
  selectedFieldId,
  selectedZoneId,
  onBack,
}) => {
  const [selectedNormId, setSelectedNormId] = useState<string | null>(null);
  const [selectedDatapoints, setSelectedDatapoints] = useState<string[]>([]);
  const [showReport, setShowReport] = useState(false);
  const [selectedNorm, setSelectedNorm] = useState<any | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [parameters, setParameters] = useState<any[]>([]);
  const [navigating, setNavigating] = useState(false);
  const [zoneDatapoints, setZoneDatapoints] = useState<Datapoint[]>([]);
  const t = useTranslation(currentLanguage);
  const navigate = useNavigate();

  // Fetch datapoints directly when zone changes
  useEffect(() => {
    const loadDatapoints = async () => {
      if (selectedZoneId) {
        try {
          console.log("Fetching datapoints for analysis from zone:", selectedZoneId);
          const datapoints = await fetchDatapointsByZoneId(selectedZoneId);
          console.log("Fetched datapoints for analysis:", datapoints.length);
          setZoneDatapoints(datapoints);
        } catch (err) {
          console.error("Error loading datapoints for analysis:", err);
          showToast("Failed to load datapoints for analysis", "error");
        }
      }
    };

    loadDatapoints();
  }, [selectedZoneId]);

  // Handle norm selection
  useEffect(() => {
    const loadNorm = async () => {
      if (!selectedNormId || selectedNormId === "") {
        setSelectedNorm(null);
        return;
      }

      try {
        // Show loading toast
        const toastId = showToast("Loading norm data...", "loading");

        const { data, error } = await supabase
          .from("norms")
          .select(
            `
            *,
            parameters:norm_parameters (
              parameter_id,
              parameter_code,
              rating_ranges
            )
          `,
          )
          .eq("id", selectedNormId)
          .single();

        if (error) {
          console.error("Error loading norm:", error);
          showToast(`Failed to load norm: ${error.message}`, "error", { id: toastId });
          throw error;
        }

        // Ensure output_config is an array
        if (data && (!data.output_config || !Array.isArray(data.output_config))) {
          data.output_config = [];
        }

        setSelectedNorm(data);
        showToast(t("norm.loadede.successfully"), "success", { id: toastId });
      } catch (err) {
        console.error("Error loading norm:", err);
        setSelectedNorm(null);
        setSelectedNormId(null);
        showToast(`Failed to load norm: ${err instanceof Error ? err.message : "Unknown error"}`, "error");
      }
    };

    loadNorm();
  }, [selectedNormId]);

  // Load analysis parameters
  useEffect(() => {
    const loadAnalysisData = async () => {
      try {
        const { data, error } = await supabase.from("analysis_parameters").select("*").order("created_at", { ascending: true });

        if (error) throw error;
        setParameters(data || []);
      } catch (err) {
        console.error("Error loading analysis data:", err);
      }
    };

    loadAnalysisData();
  }, []);

  const handleSaveAnalysis = async () => {
    if (!selectedProject || !selectedZone || !selectedNorm || selectedDatapoints.length === 0) {
      console.error("Missing required data for analysis");
      return;
    }

    try {
      // Get current user
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error("User not authenticated");

      const { data: output, error: outputError } = await supabase
        .from("analysis_outputs")
        .insert({
          hidden_id: generateHiddenId(),
          project_id: selectedProject.id,
          zone_id: selectedZone.id,
          norm_id: selectedNorm.id,
          analyst_id: user.id,
        })
        .select()
        .single();

      if (outputError) throw outputError;

      const selectedDps = selectedZone.datapoints.filter((dp) => selectedDatapoints.includes(dp.id));
      const totalRating = selectedDps.reduce((sum, dp) => sum + Object.values(dp.ratings).reduce((a, b) => a + b, 0), 0);

      const { error: versionError } = await supabase.from("analysis_versions").insert({
        output_id: output.id,
        version_number: 1,
        parameters: selectedDps.map((dp) => ({
          id: dp.id,
          values: dp.values,
          ratings: dp.ratings,
        })),
        ratings: selectedDps.reduce((acc, dp) => ({ ...acc, [dp.id]: dp.ratings }), {}),
        total_rating: totalRating,
        classification: totalRating > 0 ? "Good" : "Poor",
        recommendations: "Based on the analysis results...",
        created_by: user.id,
      });

      if (versionError) throw versionError;

      setShowReport(true);
    } catch (err) {
      console.error("Error saving analysis:", err);
      // TODO: Show error to user
    }
  };

  const handleCreateReport = async () => {
    // Show toast message and return early
    showToast("Report creation is temporarily disabled", "info");
    return;

    if (!selectedProject || !selectedZone || !selectedNorm || selectedDatapoints.length === 0) {
      setSaveError("Please select datapoints and a norm before creating a report");
      showToast("Please select datapoints and a norm before creating a report", "error");
      return;
    }

    try {
      setIsSaving(true);
      setNavigating(true);
      const toastId = showToast("Creating report...", "loading");
      setSaveError(null);

      // Get selected datapoints
      const selectedDps = selectedZone.datapoints.filter((dp) => selectedDatapoints.includes(dp.id));

      // Calculate total rating
      const totalRating = selectedDps.reduce((sum, dp) => {
        return sum + Object.values(dp.ratings || {}).reduce((a, b) => a + b, 0);
      }, 0);

      // Apply any custom calculations from norm output_config
      let calculatedRating = totalRating;
      if (selectedNorm?.output_config && Array.isArray(selectedNorm.output_config)) {
        // Check if we need to calculate zinc loss rate
        const zincLossOutput = selectedNorm.output_config.find((o) => o.id === "zincLossRate");
        if (zincLossOutput) {
          try {
            // Find parameter IDs for zinc loss calculation
            const resistivityParam = parameters.find((p) => p.shortName?.toLowerCase() === "resistivity");
            const chloridesParam = parameters.find((p) => p.shortName?.toLowerCase() === "chlorides");
            const soilTypeParam = parameters.find((p) => p.shortName?.toLowerCase() === "soil type");
            const phParam = parameters.find((p) => p.shortName?.toLowerCase() === "ph");
            const coatingThicknessParam = parameters.find((p) => p.shortName?.toLowerCase() === "coating thickness");

            if (resistivityParam && chloridesParam && soilTypeParam && phParam) {
              // Get values from first datapoint
              const firstDatapoint = selectedDps[0];
              if (firstDatapoint) {
                const parameterIds = {
                  RESISTIVITY: resistivityParam.id,
                  CHLORIDES: chloridesParam.id,
                  SOIL_TYPE: soilTypeParam.id,
                  PH: phParam.id,
                  COATING_THICKNESS: coatingThicknessParam?.id,
                };

                // Calculate zinc loss rate
                const results = calculateZincLossRate(firstDatapoint.values, parameterIds);
                const [zincLossRate, steelLossRate, zincLifetime, requiredReserve] = results;

                console.log("Zinc loss calculation results:", {
                  zincLossRate,
                  steelLossRate,
                  zincLifetime,
                  requiredReserve,
                });

                // Store the results in the correct format
                reportData.normResults = {
                  "Zinc Loss Rate": formatZincLossRate(zincLossRate),
                  "Steel Loss Rate": `${steelLossRate} μm/year`,
                  "Zinc Lifetime": `${zincLifetime} years`,
                  "Required Reserve": `${requiredReserve} mm`,
                };
              }
            }
          } catch (err) {
            console.error("Error in zinc loss calculation:", err);
          }
        }

        // Find the main output formula (usually b0)
        const mainOutput = selectedNorm.output_config.find((o) => o.id === "b0");
        if (mainOutput?.formula) {
          try {
            // Create context for each datapoint
            const results = selectedDps.map((dp) => {
              // Create a context with parameter values and ratings
              const context: Record<string, any> = {
                values: {},
                ratings: {},
              };

              // Add all parameter values to the context
              Object.entries(dp.values).forEach(([paramId, value]) => {
                const param = parameters.find((p) => p.id === paramId);
                if (param?.shortName) {
                  // Convert string numbers to actual numbers
                  let numValue = value;
                  if (typeof value === "string" && !isNaN(parseFloat(value))) {
                    numValue = parseFloat(value);
                  }
                  context.values[param.shortName] = numValue;
                }
              });

              // Add all parameter ratings to the context
              Object.entries(dp.ratings || {}).forEach(([paramId, rating]) => {
                const param = parameters.find((p) => p.id === paramId);
                if (param?.shortName) {
                  context.ratings[param.shortName] = rating;
                }
              });

              try {
                // Create a function from the formula and execute it with the context
                let formula = output.formula.trim();
                if (!formula.startsWith("return ") && !formula.includes("return ")) {
                  formula = `return ${formula}`;
                }

                const calculateOutput = new Function("values", "ratings", formula);
                console.log(`Output ${output.id} = ${outputs[output.id]}${output.unit ? ` ${output.unit}` : ""}`);
              } catch (err) {
                console.error(`Error calculating output for datapoint:`, err);
                return 0;
              }
            });

            // Add the result to the report data
            if (results.length > 0) {
              // Format the result based on its type
              const result = results[0];
              if (Array.isArray(result)) {
                reportData.normResults[output.name || output.id] = `${result[0]} ± ${result[1]}`;
              } else if (typeof result === "number") {
                reportData.normResults[output.name || output.id] = result.toFixed(2);
              } else {
                reportData.normResults[output.name || output.id] = String(result);
              }
            }
          } catch (err) {
            console.error(`Error calculating output ${output.id}:`, err);
          }
        }
      }

      // Get the datapoint IDs to include in the URL
      const datapointIds = selectedDatapoints.join(",");

      // Determine classification based on total rating
      const classification = calculatedRating >= 0 ? "Ia" : calculatedRating >= -4 ? "Ib" : calculatedRating >= -10 ? "II" : "III";

      // Create report data
      const reportData = {
        projectId: selectedProject.id,
        zoneId: selectedZone.id,
        standardId: selectedNorm.id,
        content: {
          projectName: selectedProject.name,
          zoneName: selectedZone.name,
          normName: selectedNorm.name,
          timestamp: new Date().toISOString(),
        },
        normResults: {}, // Will be populated with calculation results
        parameters: selectedDps.map((dp) => ({
          id: dp.id,
          values: dp.values,
          ratings: dp.ratings,
        })),
        ratings: selectedDps.reduce((acc, dp) => ({ ...acc, [dp.id]: dp.ratings }), {}),
        totalRating: calculatedRating,
        classification,
        recommendations:
          calculatedRating >= 0
            ? "No special measures required. Standard corrosion protection is sufficient."
            : calculatedRating >= -10
              ? "Moderate corrosion protection measures recommended."
              : "Enhanced corrosion protection measures required.",
      };

      // Create the report
      const { report } = await createReport(reportData);

      showToast("Report created successfully", "success", { id: toastId });

      // Navigate to output view with the report ID and datapoint IDs
      window.location.href = `/?view=output&reportId=${report.id}&datapointIds=${datapointIds}`;
    } catch (err) {
      console.error("Error creating report:", err);
      setSaveError("Failed to create report: " + (err instanceof Error ? err.message : String(err)));
      showToast(`Failed to create report: ${err instanceof Error ? err.message : "Unknown error"}`, "error");
      setNavigating(false);
    } finally {
      setIsSaving(false);
    }
  };

  const toggleDatapoint = (datapointId: string) => {
    // Handle special cases for select all/deselect all
    if (datapointId === "__select_all__") {
      // Select all datapoints
      const allDatapointIds = selectedZone?.datapoints.map((dp) => dp.id) || [];
      setSelectedDatapoints(allDatapointIds);
      return;
    }

    if (datapointId === "__deselect_all__") {
      // Deselect all datapoints
      setSelectedDatapoints([]);
      return;
    }

    // Normal toggle behavior for individual datapoints
    setSelectedDatapoints((prev) => (prev.includes(datapointId) ? prev.filter((id) => id !== datapointId) : [...prev, datapointId]));
  };

  // Get selected project and zone from navigation state
  const selectedProject = selectedProjectId ? projects.find((p) => p.id === selectedProjectId) : null;
  const selectedField = selectedProject && selectedFieldId ? selectedProject.fields.find((f) => f.id === selectedFieldId) : null;
  const selectedZone = selectedField && selectedZoneId ? selectedField.zones.find((z) => z.id === selectedZoneId) : null;

  if (showReport && selectedProject && selectedZone && selectedNorm) {
    return (
      <AnalysisReport
        currentTheme={currentTheme}
        currentLanguage={currentLanguage}
        project={selectedProject}
        zone={selectedZone}
        norm={selectedNorm}
        analyst={
          user
            ? {
                name: user.user_metadata?.display_name || user.email || "",
                title: user.user_metadata?.title || "",
                email: user.email || "",
              }
            : undefined
        }
        onBack={() => setShowReport(false)}
      />
    );
  }

  if (!selectedZone) {
    return <div className="p-6 text-center text-secondary">{t("datapoint.please_select_zone")}</div>;
  }

  // Use directly fetched datapoints if available, otherwise use the ones from the zone
  const availableDatapoints = zoneDatapoints.length > 0 ? zoneDatapoints : selectedZone?.datapoints || [];

  return (
    <div className="p-6">
      <div className="space-y-6">
        {/* Analysis Table */}
        <AnalyseData
          currentTheme={currentTheme}
          currentLanguage={currentLanguage}
          datapoints={availableDatapoints}
          selectedDatapoints={selectedDatapoints}
          onToggleDatapoint={toggleDatapoint}
        />

        {/* Norm Selection */}
        <AnalyseNorm
          currentTheme={currentTheme}
          currentLanguage={currentLanguage}
          selectedNormId={selectedNormId}
          onSelectNorm={setSelectedNormId}
        />

        {/* Analysis Result */}
        {selectedDatapoints.length > 0 && selectedNormId && (
          <AnalyseResult
            key={`result-${selectedDatapoints.join("-")}-${selectedNormId}-${selectedNorm?.id || "loading"}`}
            currentTheme={currentTheme}
            currentLanguage={currentLanguage}
            selectedDatapoints={availableDatapoints.filter((dp) => selectedDatapoints.includes(dp.id))}
            selectedNorm={selectedNorm}
            project={selectedProject}
            zone={selectedZone}
          />
        )}

        {/* Create Report Button */}
        {selectedDatapoints.length > 0 && selectedNormId && (
          <div className="flex justify-between items-center mt-8 border-t pt-6 border-input bg-card p-4 rounded-lg">
            <div className="flex-1">
              <h3 className="text-lg font-medium mb-2">{t("analysis.report_options")}</h3>
              <p className="text-sm text-muted-foreground mb-4">{t("analysis.report_description")}</p>
              {saveError && <div className="p-3 mb-4 text-sm rounded bg-destructive/10 text-destructive">{saveError}</div>}
            </div>
            <div className="flex gap-3">
              <Button
                onClick={(e) => {
                  e.preventDefault();
                  showToast("Preview report is temporarily disabled", "info");
                }}
                title="Preview a report from the selected datapoints"
                disabled={true}
                variant="outline"
                className="px-6 py-3 rounded text-sm flex items-center gap-2 opacity-50 cursor-not-allowed"
              >
                <FileText size={16} />
                {t("analysis.preview_report")}
              </Button>
              <Button
                onClick={(e) => {
                  e.preventDefault();
                  showToast("Report creation is temporarily disabled", "info");
                }}
                disabled={true}
                className="px-6 py-3 rounded text-sm flex items-center gap-2 text-white bg-accent-primary opacity-50 cursor-not-allowed"
                title="Report creation is temporarily disabled"
              >
                <FileCheck size={16} />
                {t("analysis.create_report")}
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default AnalysisPanel;
