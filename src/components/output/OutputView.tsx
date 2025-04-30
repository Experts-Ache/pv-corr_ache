import React, { useState, useEffect, useRef } from "react";
import { Theme } from "../../types/theme";
import { Language, useTranslation } from "../../types/language";
import { Project, Zone } from "../../types/projects";
import { Loader2, ChevronLeft, Info } from "lucide-react";
import { supabase } from "../../lib/supabase";
import { getCurrentVersion } from "../../services/versions";
import { showToast } from "../../lib/toast";
import { Button } from "../ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";
import { useLocation, useNavigate } from "react-router-dom";
import { createReport } from "../../services/reports";
import { fetchDatapointsByZoneId } from "../../services/datapoints";
import { fetchProject, fetchZone, fetchParameterDetails, fetchReportById, createPreviewReport } from "../../services/reportService";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../ui/table";
import ReportHeader from "./ReportHeader";
import ReportMethodology from "./ReportMethodology";
import ReportParameters from "./ReportParameters";
import ReportResults from "./ReportResults";
import ReportControls from "./ReportControls";

interface OutputViewProps {
  currentTheme: Theme;
  currentLanguage: Language;
  project?: Project;
  zone?: Zone;
  normId?: string;
  reportId?: string;
  onBack: () => void;
}

const OutputView: React.FC<OutputViewProps> = ({ currentTheme, currentLanguage, project, zone, normId, reportId, onBack }) => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reportData, setReportData] = useState<any>(null);
  const [selectedDatapoints, setSelectedDatapoints] = useState<any[]>([]);
  const [norm, setNorm] = useState<any>(null);
  const [currentVersion, setCurrentVersion] = useState<string>("1.0.0");
  const [analyst, setAnalyst] = useState<{
    name: string;
    title?: string;
    email?: string;
  } | null>(null);
  const t = useTranslation(currentLanguage);
  const location = useLocation();
  const navigate = useNavigate();
  const [parameterDetails, setParameterDetails] = useState<Record<string, { name: string; unit: string }>>({});

  // State for saving report
  const [isSaving, setIsSaving] = useState(false);
  // Use a ref to track if we've already loaded data to prevent multiple refreshes
  const dataLoadedRef = useRef(false);

  // Load report data based on URL parameters
  useEffect(() => {
    const loadReportData = async () => {
      // Skip if we've already loaded data
      if (dataLoadedRef.current) {
        return;
      }

      try {
        setLoading(true);
        // Get parameters from URL
        const params = new URLSearchParams(location.search);
        const reportIdFromUrl = params.get("reportId") || reportId;
        const versionNumber = params.get("version") || undefined;
        const preview = params.get("preview") === "true";
        const projectId = params.get("projectId") || project?.id;
        const zoneId = params.get("zoneId") || zone?.id;
        const normIdFromUrl = params.get("normId");
        const normIdToUse = normId || normIdFromUrl;
        const datapointIds = params.get("datapointIds")?.split(",") || [];

        if (reportIdFromUrl) {
          // Load specific report
          const { report, version, norm: normData } = await fetchReportById(reportIdFromUrl, versionNumber);

          setReportData({
            id: report.id,
            hidden_id: report.hidden_id,
            project_id: report.project_id || projectId,
            zone_id: report.zone_id || zoneId,
            norm_id: report.norm_id || normIdToUse,
            analyst_id: report.analyst_id || (await supabase.auth.getUser()).data.user?.id,
            created_at: report.created_at,
            currentVersion: version,
          });
          setNorm(normData);
        } else if ((project && zone && normIdToUse) || (preview === "true" && projectId && zoneId && normIdToUse)) {
          // Preview mode - construct data from current selection or URL parameters
          const previewData = await createPreviewReport(
            projectId || project?.id || "",
            zoneId || zone?.id || "",
            normIdToUse || "",
            datapointIds,
          );

          setReportData(previewData.reportData);
          setNorm(previewData.norm);
          setSelectedDatapoints(previewData.datapoints);
        } else {
          throw new Error("Insufficient data to display report");
        }

        // Get app version
        getCurrentVersion()
          .then((version) => {
            if (version) {
              setCurrentVersion(version.version);
            }
          })
          .catch((versionError) => {
            console.warn("Error getting current version:", versionError);
            // Non-critical error, continue with default version
          });

        // Get current user info
        supabase.auth
          .getUser()
          .then(({ data: { user } }) => {
            if (user) {
              setAnalyst({
                name: user.user_metadata?.display_name || user.email || "",
                title: user.user_metadata?.title || "",
                email: user.email || "",
              });
            }
          })
          .catch((userError) => {
            console.warn("Error getting user:", userError);
            // Non-critical error, continue with default analyst info
          });

        // Load parameter details for all datapoints
        const loadParameterDetails = async () => {
          try {
            // Get all parameter IDs from the datapoints
            const pointsToUse = selectedDatapoints.length > 0 ? selectedDatapoints : zone?.datapoints || [];
            if (!pointsToUse || pointsToUse.length === 0) return;

            const firstDatapoint = pointsToUse[0];
            if (!firstDatapoint?.values) return;

            const paramIds = Object.keys(firstDatapoint.values);
            if (paramIds.length === 0) return;

            const detailsMap = await fetchParameterDetails(paramIds);
            setParameterDetails(detailsMap);
          } catch (err) {
            console.error("Error loading parameter details:", err);
          }
        };

        loadParameterDetails();
      } catch (err) {
        console.error("Error loading report data:", err);
        setError(err instanceof Error ? err.message : "Failed to load report");
      } finally {
        setLoading(false);
      }

      // Mark that we've loaded data
      dataLoadedRef.current = true;
    };

    loadReportData();
  }, [location.search, project, zone, normId]);

  const handleSaveAsReport = async () => {
    if (!project || !zone || !normId) {
      showToast("Missing required data to save report", "error");
      return;
    }

    try {
      setIsSaving(true);
      const toastId = showToast("Saving report...", "loading");

      // Get current user
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error("User not authenticated");

      // Get datapoints for this zone
      const datapoints = await fetchDatapointsByZoneId(zone.id);
      if (!datapoints || datapoints.length === 0) {
        throw new Error("No datapoints found for this zone");
      }

      // Calculate total rating
      const totalRating = datapoints.reduce((sum, dp) => {
        return sum + Object.values(dp.ratings || {}).reduce((a: number, b: number) => a + b, 0);
      }, 0);

      // Determine classification based on total rating
      const classification = totalRating >= 0 ? "Ia" : totalRating >= -4 ? "Ib" : totalRating >= -10 ? "II" : "III";

      // Create report data
      const reportData = {
        projectId: project.id,
        zoneId: zone.id,
        standardId: normId,
        content: {
          projectName: project.name,
          zoneName: zone.name,
          normName: norm?.name || "Standard Analysis",
          timestamp: new Date().toISOString(),
        },
        normResults: {}, // Will be populated with calculation results if available
        parameters: datapoints.map((dp) => ({
          id: dp.id,
          values: dp.values,
          ratings: dp.ratings,
        })),
        ratings: datapoints.reduce((acc, dp) => ({ ...acc, [dp.id]: dp.ratings }), {}),
        totalRating,
        classification,
        recommendations:
          totalRating >= 0
            ? "No special measures required. Standard corrosion protection is sufficient."
            : totalRating >= -10
              ? "Moderate corrosion protection measures recommended."
              : "Enhanced corrosion protection measures required.",
      };

      // Create the report
      const { report } = await createReport(reportData);

      showToast("Report saved successfully", "success", { id: toastId });

      // Navigate to reports view
      navigate("?view=reports");
    } catch (err) {
      console.error("Error saving report:", err);
      showToast(`Failed to save report: ${err instanceof Error ? err.message : "Unknown error"}`, "error");
    } finally {
      setIsSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="p-6 flex items-center justify-center h-screen">
        <div className="text-center space-y-4">
          <Loader2 className="h-12 w-12 animate-spin text-primary mx-auto" />
          <p className="text-muted-foreground">{t("output.loading")}</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6">
        <div className="mb-4">
          <Button onClick={onBack} variant="ghost" className="flex items-center gap-2">
            <ChevronLeft size={16} />
            {t("nav.back")}
          </Button>
        </div>
        <Card className="border-destructive">
          <CardHeader>
            <CardTitle className="text-destructive">{t("output.error")}</CardTitle>
          </CardHeader>
          <CardContent>
            <p>{error}</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!reportData) {
    return (
      <div className="p-6">
        <Button onClick={onBack} variant="ghost" className="mb-4 flex items-center gap-2">
          <ChevronLeft size={16} />
          {t("nav.back")}
        </Button>
        <Card>
          <CardHeader>
            <CardTitle>{t("output.no_data")}</CardTitle>
          </CardHeader>
          <CardContent>
            <p>{t("output.select_report")}</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Calculate classification based on total rating
  const totalRating = reportData?.currentVersion?.total_rating ?? 0;
  const classification =
    totalRating >= 0
      ? { class: "Ia", stress: t("analysis.stress.very_low") }
      : totalRating >= -4
        ? { class: "Ib", stress: t("analysis.stress.low") }
        : totalRating >= -10
          ? { class: "II", stress: t("analysis.stress.medium") }
          : { class: "III", stress: t("analysis.stress.high") };

  // Use the selected datapoints or fall back to zone datapoints
  const datapointsToUse = selectedDatapoints.length > 0 ? selectedDatapoints : zone?.datapoints || [];

  return (
    <div className="p-6 max-w-[210mm] mx-auto bg-background print:bg-white print:p-0">
      {/* Report Controls */}
      <ReportControls onBack={onBack} onSave={handleSaveAsReport} isSaving={isSaving} isReportSaved={!!reportId} />

      {/* Report Header */}
      <ReportHeader
        project={project}
        zone={zone}
        norm={norm}
        reportId={reportData.hidden_id}
        createdAt={reportData.currentVersion.created_at}
      />

      {/* Analysis Methodology */}
      <ReportMethodology norm={norm} />

      {/* Parameters and Results */}
      <ReportParameters datapointsToUse={datapointsToUse} parameterDetails={parameterDetails} className="print:page-break-after-avoid" />

      {/* Analysis Results */}
      <ReportResults
        totalRating={totalRating}
        classification={classification}
        normResults={reportData?.currentVersion?.content?.normResults}
        calculationResults={reportData?.currentVersion?.content?.calculationResults}
        datapointsToUse={datapointsToUse}
        project={project}
        className="print:page-break-before-avoid"
      />
    </div>
  );
};

export default OutputView;
