import React, { useState } from "react";
import { Theme } from "../../types/theme";
import { Language, useTranslation } from "../../types/language";
import { Project } from "../../types/projects";
import {
  FileText,
  Download,
  Eye,
  History,
  Info,
  Loader2,
  Share,
  ChevronLeft,
  Calendar,
  User,
  Building2,
  MapPin,
  Check,
  X,
  Printer,
  AlertTriangle,
} from "lucide-react";
import { useLocation, useNavigate } from "react-router-dom";
import { useEffect } from "react";
import { supabase } from "../../lib/supabase";
import { showToast } from "../../lib/toast";
import OutputView from "../output/OutputView";
import { Button } from "../ui/button";
import { fetchReports } from "../../services/reports";
import { Card, CardContent } from "../ui/card";

interface OutputProps {
  currentTheme: Theme;
  currentLanguage: Language;
  projects: Project[];
  reports: any[];
}

interface Report {
  id: string;
  hiddenId: string;
  projectId: string;
  zoneId: string;
  normId: string;
  createdAt: string;
  versions: {
    id: string;
    versionNumber: number;
    totalRating: number;
    classification: string;
    createdAt: string;
  }[];
}

const Output: React.FC<OutputProps> = ({ currentTheme, currentLanguage, projects, reports: initialReports }) => {
  const [reports, setReports] = useState<Report[]>(initialReports || []);
  const [selectedReport, setSelectedReport] = useState<string | null>(null);
  const [showPreview, setShowPreview] = useState(false);
  const [selectedVersion, setSelectedVersion] = useState<any>(null);
  const [selectedNorm, setSelectedNorm] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [loadingReports, setLoadingReports] = useState(true);
  const [projectData, setProjectData] = useState<Project | null>(null);
  const [retryCount, setRetryCount] = useState(0);
  const location = useLocation();
  const navigate = useNavigate();
  const t = useTranslation(currentLanguage);
  const [error, setError] = useState<string | null>(null);

  // Load reports when component mounts
  useEffect(() => {
    const loadReports = async () => {
      try {
        setLoadingReports(true);
        setError(null);
        const fetchedReports = await fetchReports();
        setReports(fetchedReports || []);
      } catch (err) {
        console.error("Error loading reports:", err);
        const errorMessage = err instanceof Error ? err.message : "Failed to load reports";
        setError(errorMessage);

        // Implement retry logic
        if (retryCount < 3) {
          setTimeout(() => {
            setRetryCount((prev) => prev + 1);
          }, 1000); // Wait 1 second before retrying
        }
      } finally {
        setLoadingReports(false);
      }
    };

    loadReports();
  }, [initialReports, retryCount]);

  useEffect(() => {
    const loadPreview = async () => {
      const params = new URLSearchParams(location.search);
      const reportId = params.get("reportId");
      const versionNumber = params.get("version");
      const preview = params.get("preview") === "true";
      const projectId = params.get("projectId") || "";
      const zoneId = params.get("zoneId") || "";
      const normId = params.get("normId") || "";

      console.log("URL parameters:", { reportId, versionNumber, preview, projectId, zoneId, normId });

      if (reportId) {
        try {
          setError(null);
          // Load specific report
          const { data: report, error: reportError } = await supabase
            .from("analysis_outputs")
            .select("*, versions:analysis_versions(*)")
            .eq("id", reportId)
            .maybeSingle();

          if (reportError) throw reportError;

          if (!report) {
            throw new Error("Report not found");
          }

          if (!report?.versions || report.versions.length === 0) {
            throw new Error("No versions found for this report. Please try again later.");
          }

          // Get the specific version or latest
          let version;
          if (versionNumber) {
            version = report.versions.find((v: any) => v.version_number?.toString() === versionNumber);
            if (!version) {
              throw new Error(`Version ${versionNumber} not found`);
            }
          } else {
            // Sort versions by version number descending and get the first one
            version = [...report.versions].sort((a, b) => b.version_number - a.version_number)[0];
          }

          // Load norm data
          const { data: normData, error: normError } = await supabase.from("norms").select("*").eq("id", report.norm_id).maybeSingle();

          if (normError) throw normError;
          if (!normData) {
            throw new Error("Norm not found");
          }

          setSelectedVersion({
            ...version,
            projectId: report.project_id,
            zoneId: report.zone_id,
            normId: report.norm_id,
          });
          setSelectedNorm(normData);
          setShowPreview(true);

          // Set loading to false after successful data load
          setLoading(false);
        } catch (err) {
          console.error("Error loading report:", err);
          setError(err instanceof Error ? err.message : "Failed to load report");
          setLoading(false);
        }
        return;
      }

      if (preview && projectId && zoneId && normId) {
        console.log("Loading preview with params:", { projectId, zoneId, normId });
        try {
          setError(null);
          // First try to find project in props
          let foundProject = projects.find((p) => p.id === projectId);

          // If not found in props, fetch from Supabase
          if (!foundProject) {
            const { data: projectData, error: projectError } = await supabase
              .from("projects")
              .select(
                `
                *,
                fields (
                  *,
                  zones (*)
                )
              `,
              )
              .eq("id", projectId)
              .maybeSingle();

            if (projectError) throw projectError;
            if (!projectData) throw new Error("Project not found");

            foundProject = projectData;
            setProjectData(projectData);
          }

          // Find zone in project
          let foundZone = null;
          for (const field of foundProject.fields || []) {
            for (const z of field.zones || []) {
              if (z.id === zoneId) {
                foundZone = z;
                break;
              }
            }
            if (foundZone) break;
          }

          if (!foundZone) {
            throw new Error("Zone not found");
          }

          // Load norm data
          const { data: norm, error: normError } = await supabase.from("norms").select("*").eq("id", normId).maybeSingle();

          if (normError) throw normError;
          if (!norm) {
            throw new Error("Norm not found");
          }

          setSelectedNorm(norm);

          // Get user info from auth
          const {
            data: { user },
            error: userError,
          } = await supabase.auth.getUser();

          if (userError) throw userError;
          if (!user) throw new Error("User not authenticated");

          setSelectedVersion({
            projectId,
            zoneId,
            normId,
            project: foundProject,
            zone: foundZone,
            analyst: {
              name: user?.user_metadata?.display_name || user?.email || "",
              title: user?.user_metadata?.title || "",
              email: user?.email || "",
            },
          });
          setShowPreview(true);

          // Set loading to false after successful data load
          setLoading(false);
        } catch (err) {
          console.error("Error loading preview data:", err);
          setError(`Failed to load preview data: ${err instanceof Error ? err.message : String(err)}`);
          setLoading(false);

          // If error is auth-related, redirect to login
          if (err instanceof Error && err.message.includes("not authenticated")) {
            navigate("/login");
          }
        }
      } else {
        // If no report or preview parameters, just show the reports list
        setLoading(false);
      }
    };

    loadPreview();
  }, [location.search, projects, navigate]);

  const getProjectName = (projectId: string): string => {
    const project = projects.find((p) => p.id === projectId) || projectData;
    return project?.name || "Unknown Project";
  };

  const getZoneName = (projectId: string, zoneId: string): string => {
    const project = projects.find((p) => p.id === projectId) || projectData;
    if (!project) return "Unknown Zone";

    for (const field of project.fields) {
      const zone = field.zones.find((z) => z.id === zoneId);
      if (zone) return zone.name;
    }
    return "Unknown Zone";
  };

  const getNormName = (normId: string): string => {
    return normId || t("analysis.standard_analysis");
  };

  // Check if we should show the report view
  const shouldShowReport = () => {
    const hasReportId = new URLSearchParams(location.search).has("reportId");
    const params = new URLSearchParams(location.search);

    if (showPreview) return true;

    // Check URL parameters for direct report viewing
    const isPreview = params.get("preview") === "true";
    const result = hasReportId || (isPreview && params.get("projectId") && params.get("zoneId") && params.get("normId"));

    return result;
  };

  const handleShowPreview = (report: Report, version: any) => {
    console.log("Showing preview for report:", report.id, "version:", version);
    setSelectedVersion({
      ...version,
      projectId: report.projectId,
      zoneId: report.zoneId,
      normId: report.normId,
    });
    setShowPreview(true);
  };

  const handleRetry = async () => {
    setRetryCount(0);
    setError(null);
    setLoadingReports(true);
    try {
      const fetchedReports = await fetchReports();
      setReports(fetchedReports || []);
    } catch (err) {
      console.error("Error retrying report fetch:", err);
      setError(err instanceof Error ? err.message : "Failed to load reports");
    } finally {
      setLoadingReports(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (shouldShowReport()) {
    // Find the project and zone based on the selected version or URL parameters
    const projectId = selectedVersion?.projectId || new URLSearchParams(location.search).get("projectId");
    const zoneId = selectedVersion?.zoneId || new URLSearchParams(location.search).get("zoneId");
    const reportId = new URLSearchParams(location.search).get("reportId");
    const normIdParam = new URLSearchParams(location.search).get("normId");
    const normIdToUse = selectedVersion?.normId || normIdParam || "";

    // Use the project and zone from selectedVersion if available, otherwise find them in projects or projectData
    const project = selectedVersion?.project || projects.find((p) => p.id === projectId) || projectData;
    let zone = selectedVersion?.zone;

    // If we don't have the zone from selectedVersion, find it in the project
    if (!zone && project) {
      // Search through all fields and their zones to find the matching zone
      for (const field of project.fields || []) {
        const matchingZone = field.zones?.find((z) => z.id === zoneId);
        if (matchingZone) {
          zone = matchingZone;
          break;
        }
      }
    }

    return (
      <OutputView
        currentTheme={currentTheme}
        currentLanguage={currentLanguage}
        project={project}
        zone={zone}
        normId={normIdToUse}
        reportId={reportId || undefined}
        onBack={() => {
          setShowPreview(false);
          setSelectedVersion(null);
          setSelectedNorm(null);
          setProjectData(null);

          // If we came from a direct URL, navigate back to reports list
          const params = new URLSearchParams(location.search);
          if (params.has("reportId") || params.get("preview") === "true") {
            navigate("?view=reports");
          }
        }}
      />
    );
  }

  return (
    <div className="p-6">
      <h2 className="text-2xl font-bold text-primary mb-6">{t("output.title")}</h2>

      <div className="space-y-4">
        {error && (
          <Card className="border-destructive">
            <CardContent className="p-6">
              <div className="flex items-start gap-4">
                <AlertTriangle className="h-5 w-5 text-destructive flex-shrink-0 mt-0.5" />
                <div className="flex-1">
                  <h3 className="font-medium text-destructive mb-2">{t("common.error")}</h3>
                  <p className="text-sm text-destructive/90 mb-4">{error}</p>
                  <Button variant="outline" size="sm" onClick={handleRetry} disabled={loadingReports}>
                    {loadingReports ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <AlertTriangle className="h-4 w-4 mr-2" />}
                    {t("common.retry")}
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {loadingReports ? (
          <Card className="border border-input">
            <CardContent className="p-6 text-center">
              <Loader2 className="mx-auto h-12 w-12 mb-4 text-muted-foreground/50 animate-spin" />
              <h3 className="text-lg font-medium mb-2">{t("output.loading")}</h3>
            </CardContent>
          </Card>
        ) : reports.length === 0 ? (
          <Card className="border border-input">
            <CardContent className="p-6 text-center">
              <FileText className="mx-auto h-12 w-12 mb-4 text-muted-foreground/50" />
              <h3 className="text-lg font-medium mb-2">{t("output.no_reports")}</h3>
              <div className="max-w-md mx-auto">
                <p className="mb-4">{t("output.no_reports_description")}</p>
                <div className="text-left space-y-2 mb-4">
                  <div className="flex items-start gap-2">
                    <div className="bg-primary/10 rounded-full p-1 mt-0.5">
                      <Info size={14} />
                    </div>
                    <p>{t("output.create_report_instruction_1")}</p>
                  </div>
                  <div className="flex items-start gap-2">
                    <div className="bg-primary/10 rounded-full p-1 mt-0.5">
                      <Info size={14} />
                    </div>
                    <p>{t("output.create_report_instruction_2")}</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {reports.map((report) => (
              <div key={report.id} className="p-4 rounded-lg border border-theme bg-card">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <div className="flex items-center gap-2">
                      <FileText className="text-accent-primary" size={16} />
                      <span className="font-medium text-primary">
                        {getProjectName(report.project_id)} - {getZoneName(report.project_id, report.zone_id)}
                      </span>
                    </div>
                    <div className="text-sm text-secondary mt-1">{getNormName(report.norm_id)}</div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setSelectedReport(report.id)}
                      className="p-2 rounded hover:bg-opacity-80 text-secondary"
                      title={t("output.view_history")}
                    >
                      <History size={16} />
                    </button>
                    <button
                      onClick={() => navigate(`?view=output&reportId=${report.id}`)}
                      className="p-2 rounded hover:bg-opacity-80 text-secondary"
                      title={t("output.view_report")}
                    >
                      <Eye size={16} />
                    </button>
                    <button
                      onClick={() => window.open(`/reports/${report.id}/latest/download`, "_blank")}
                      className="p-2 rounded hover:bg-opacity-80 text-secondary"
                      title={t("output.download_report")}
                    >
                      <Download size={16} />
                    </button>
                  </div>
                </div>

                {selectedReport === report.id && (
                  <div className="mt-4 border-t border-theme pt-4">
                    <h4 className="text-sm font-medium text-secondary mb-2">{t("output.version_history")}</h4>
                    <div className="space-y-2">
                      {report.versions.map((version) => (
                        <div key={version.id} className="flex items-center justify-between p-2 rounded bg-theme">
                          <div>
                            <div className="text-sm text-primary">
                              {t("output.version")} {version.version_number}
                            </div>
                            <div className="text-xs text-secondary">{new Date(version.created_at).toLocaleString()}</div>
                          </div>
                          <div className="flex items-center gap-2">
                            <div className="text-sm text-secondary">
                              {t("analysis.total_rating")}: {version.total_rating}
                            </div>
                            <button
                              onClick={() => handleViewReport(report.id)}
                              className="p-1 rounded hover:bg-opacity-80 text-secondary"
                              title={t("output.view_version")}
                            >
                              <Eye size={14} />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default Output;
