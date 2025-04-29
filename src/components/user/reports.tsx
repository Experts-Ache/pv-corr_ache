import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
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
  Search,
  Filter,
  SortDesc,
  SortAsc,
  Calendar,
  Tag,
  User,
  Trash2,
  AlertCircle,
} from "lucide-react";
import { fetchReports, deleteReport } from "../../services/reports";
import { showToast } from "../../lib/toast";
import { Button } from "../ui/button";
import { Card, CardContent } from "../ui/card";
import { Input } from "../ui/input";
import { Badge } from "../ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../ui/tabs";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "../ui/dialog";

interface ReportsProps {
  currentTheme: Theme;
  currentLanguage: Language;
  projects: Project[];
  reports: any[];
  selectedReportId?: string;
  onSelectReport: (reportId: string) => void;
}

const Reports: React.FC<ReportsProps> = ({
  currentTheme,
  currentLanguage,
  projects,
  reports: initialReports,
  selectedReportId,
  onSelectReport,
}) => {
  const navigate = useNavigate();
  const [reports, setReports] = useState<any[]>(initialReports || []);
  const [filteredReports, setFilteredReports] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [sortField, setSortField] = useState<"date" | "name" | "rating">("date");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("desc");
  const [filterProject, setFilterProject] = useState<string>("all");
  const [filterClassification, setFilterClassification] = useState<string>("all");
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [reportToDelete, setReportToDelete] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const t = useTranslation(currentLanguage);
  const [viewingReport, setViewingReport] = useState(false);

  // Load reports when component mounts
  useEffect(() => {
    const loadReports = async () => {
      if (!initialReports || initialReports.length === 0) {
        try {
          setLoading(true);
          const fetchedReports = await fetchReports();
          setReports(fetchedReports || []);
          setFilteredReports(fetchedReports || []);
        } catch (err) {
          console.error("Error loading reports:", err);
          setError("Failed to load reports");
        } finally {
          setLoading(false);
        }
      } else {
        setReports(initialReports);
        setFilteredReports(initialReports);
        setLoading(false);
      }
    };

    loadReports();
  }, [initialReports]);

  // Apply filters and sorting when dependencies change
  useEffect(() => {
    if (!reports || reports.length === 0) return;

    let filtered = [...reports];

    // Apply project filter
    if (filterProject !== "all") {
      filtered = filtered.filter((report) => report.project_id === filterProject);
    }

    // Apply classification filter
    if (filterClassification !== "all") {
      filtered = filtered.filter((report) => {
        const latestVersion =
          report.versions && report.versions.length > 0
            ? report.versions.sort((a: any, b: any) => b.version_number - a.version_number)[0]
            : null;

        if (!latestVersion) return false;

        const totalRating = latestVersion.total_rating || 0;

        switch (filterClassification) {
          case "ia":
            return totalRating >= 0;
          case "ib":
            return totalRating >= -4 && totalRating < 0;
          case "ii":
            return totalRating >= -10 && totalRating < -4;
          case "iii":
            return totalRating < -10;
          default:
            return true;
        }
      });
    }

    // Apply search term
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter((report) => {
        const projectName = getProjectName(report.project_id).toLowerCase();
        const zoneName = getZoneName(report.project_id, report.zone_id).toLowerCase();
        return projectName.includes(term) || zoneName.includes(term);
      });
    }

    // Apply sorting
    filtered.sort((a, b) => {
      let comparison = 0;

      switch (sortField) {
        case "date":
          comparison = new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
          break;
        case "name":
          const aName = `${getProjectName(a.project_id)} - ${getZoneName(a.project_id, a.zone_id)}`;
          const bName = `${getProjectName(b.project_id)} - ${getZoneName(b.project_id, b.zone_id)}`;
          comparison = aName.localeCompare(bName);
          break;
        case "rating":
          const aRating = getLatestRating(a);
          const bRating = getLatestRating(b);
          comparison = bRating - aRating;
          break;
      }

      return sortDirection === "asc" ? comparison * -1 : comparison;
    });

    setFilteredReports(filtered);
  }, [reports, searchTerm, sortField, sortDirection, filterProject, filterClassification]);

  const getProjectName = (projectId: string): string => {
    return projects.find((p) => p.id === projectId)?.name || "Unknown Project";
  };

  const getZoneName = (projectId: string, zoneId: string): string => {
    const project = projects.find((p) => p.id === projectId);
    if (!project) return "Unknown Zone";

    for (const field of project.fields) {
      const zone = field.zones.find((z) => z.id === zoneId);
      if (zone) return zone.name;
    }
    return "Unknown Zone";
  };

  const getLatestRating = (report: any): number => {
    if (!report.versions || !Array.isArray(report.versions) || report.versions.length === 0) {
      return 0;
    }

    const latestVersion = report.versions.sort((a: any, b: any) => b.version_number - a.version_number)[0];
    return latestVersion.total_rating || 0;
  };

  const getClassificationBadge = (totalRating: number) => {
    if (totalRating >= 0) {
      return <Badge variant="success">Class Ia</Badge>;
    } else if (totalRating >= -4) {
      return <Badge className="bg-blue-500/20 text-blue-700 dark:text-blue-300">Class Ib</Badge>;
    } else if (totalRating >= -10) {
      return <Badge className="bg-yellow-500/20 text-yellow-700 dark:text-yellow-300">Class II</Badge>;
    } else {
      return <Badge variant="destructive">Class III</Badge>;
    }
  };

  const handleViewReport = (reportId: string) => {
    // First update the selected report ID through the parent component
    onSelectReport(reportId);

    // Use window.location for a full page navigation
    window.location.href = `/?view=output&reportId=${reportId}`;

    // Set viewing report to true to prevent unnecessary re-rendering
    setViewingReport(true);
  };

  const toggleSortDirection = () => {
    setSortDirection((prev) => (prev === "asc" ? "desc" : "asc"));
  };

  const handleDeleteReport = async (reportId: string) => {
    try {
      setIsDeleting(true);
      setError(null);

      console.log("Deleting report:", reportId);
      await deleteReport(reportId);

      // Update the reports list
      const updatedReports = reports.filter((report) => report.id !== reportId);
      setReports(updatedReports);

      // Also update filtered reports
      setFilteredReports(filteredReports.filter((report) => report.id !== reportId));

      // Reload reports from the server to ensure UI is in sync with database
      const fetchedReports = await fetchReports();
      setReports(fetchedReports || []);

      // Apply current filters to the newly fetched reports
      let filtered = [...fetchedReports];
      if (filterProject !== "all") {
        filtered = filtered.filter((report) => report.project_id === filterProject);
      }
      if (filterClassification !== "all") {
        // Apply classification filter logic
        filtered = filtered.filter((report) => {
          const latestVersion =
            report.versions && report.versions.length > 0
              ? report.versions.sort((a: any, b: any) => b.version_number - a.version_number)[0]
              : null;

          if (!latestVersion) return false;

          const totalRating = latestVersion.total_rating || 0;

          switch (filterClassification) {
            case "ia":
              return totalRating >= 0;
            case "ib":
              return totalRating >= -4 && totalRating < 0;
            case "ii":
              return totalRating >= -10 && totalRating < -4;
            case "iii":
              return totalRating < -10;
            default:
              return true;
          }
        });
      }
      if (searchTerm) {
        const term = searchTerm.toLowerCase();
        filtered = filtered.filter((report) => {
          const projectName = getProjectName(report.project_id).toLowerCase();
          const zoneName = getZoneName(report.project_id, report.zone_id).toLowerCase();
          return projectName.includes(term) || zoneName.includes(term);
        });
      }
      setFilteredReports(filtered);

      // Show success message
      setError("Report deleted successfully");
      showToast(t("report.delete"), "success");
      showToast("Report deleted successfully", "success");
      setTimeout(() => setError(null), 3000);
    } catch (err) {
      console.error("Error deleting report:", err);
      setError("Failed to delete report: " + (err instanceof Error ? err.message : String(err)));
      showToast(`Failed to delete report: ${err instanceof Error ? err.message : "Unknown error"}`, "error");
      showToast(`Failed to delete report: ${err instanceof Error ? err.message : "Unknown error"}`, "error");
    } finally {
      setIsDeleting(false);
      setDeleteDialogOpen(false);
      setReportToDelete(null);
    }
  };

  const confirmDelete = (reportId: string, e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent triggering the parent onClick
    setReportToDelete(reportId);
    console.log("Opening delete dialog for report:", reportId);
    setDeleteDialogOpen(true);
  };

  if (loading) {
    return (
      <div className="p-6">
        <Card className="border border-input">
          <CardContent className="p-6 text-center">
            <Loader2 className="mx-auto h-12 w-12 mb-4 text-muted-foreground/50 animate-spin" />
            <h3 className="text-lg font-medium mb-2">{t("output.loading")}</h3>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
        <h2 className="text-2xl font-bold text-primary">{t("reports.title")}</h2>

        <div className="flex flex-col md:flex-row gap-3 w-full md:w-auto">
          <div className="relative flex-1 md:w-64">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground" size={16} />
            <Input placeholder={t("reports.search")} value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="pl-9" />
          </div>

          <div className="flex gap-2">
            <Select value={filterProject} onValueChange={setFilterProject}>
              <SelectTrigger className="w-[180px]">
                <Filter size={16} className="mr-2" />
                <SelectValue placeholder={t("reports.filter_project")} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t("reports.all_projects")}</SelectItem>
                {projects.map((project) => (
                  <SelectItem key={project.id} value={project.id}>
                    {project.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={filterClassification} onValueChange={setFilterClassification}>
              <SelectTrigger className="w-[180px]">
                <Tag size={16} className="mr-2" />
                <SelectValue placeholder={t("reports.filter_class")} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t("reports.all_classifications")}</SelectItem>
                <SelectItem value="ia">Class Ia</SelectItem>
                <SelectItem value="ib">Class Ib</SelectItem>
                <SelectItem value="ii">Class II</SelectItem>
                <SelectItem value="iii">Class III</SelectItem>
              </SelectContent>
            </Select>

            <Button
              variant="outline"
              size="icon"
              onClick={toggleSortDirection}
              title={`Sort ${sortDirection === "asc" ? "ascending" : "descending"}`}
            >
              {sortDirection === "asc" ? <SortAsc size={16} /> : <SortDesc size={16} />}
            </Button>
          </div>
        </div>
      </div>

      <Tabs defaultValue="all" className="mb-6">
        <TabsList>
          <TabsTrigger value="all">{t("reports.tabs.all")}</TabsTrigger>
          <TabsTrigger value="recent">{t("reports.tabs.recent")}</TabsTrigger>
          <TabsTrigger value="favorites">{t("reports.tabs.favorites")}</TabsTrigger>
        </TabsList>

        <TabsContent value="all" className="mt-4">
          {error && <div className="p-4 mb-4 rounded-md text-destructive border border-destructive bg-destructive/10">{error}</div>}

          {filteredReports.length === 0 && (
            <Card className="border border-input">
              <CardContent className="p-6 text-center">
                <FileText className="mx-auto h-12 w-12 mb-4 text-muted-foreground/50" />
                <h3 className="text-lg font-medium mb-2">{t("reports.no_reports")}</h3>
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
          )}

          <div className="space-y-4 mt-6">
            {filteredReports.map((report) => (
              <div
                key={report.id}
                className="p-4 rounded-lg border border-input bg-card hover:bg-accent/5 transition-colors cursor-pointer"
                onClick={() => handleViewReport(report.id)}
              >
                <div className="flex items-center justify-between mb-2">
                  <div>
                    <div className="flex items-center gap-2">
                      <FileText className="text-accent-primary h-4 w-4" />
                      <span className="font-medium">
                        {getProjectName(report.project_id)} - {getZoneName(report.project_id, report.zone_id)}
                      </span>
                    </div>
                    <div className="text-xs text-muted-foreground mt-1">{new Date(report.created_at).toLocaleDateString()}</div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      onClick={() => navigate(`?view=output&reportId=${report.id}`)}
                      variant="ghost"
                      size="sm"
                      className="h-8 w-8 p-0"
                    >
                      <Eye size={16} />
                    </Button>
                    <Button
                      onClick={(e) => {
                        e.stopPropagation();
                        // Disabled for now
                        showToast(t("report.dowload.disabled"), "info");
                      }}
                      variant="ghost"
                      size="sm"
                      className="h-8 w-8 p-0"
                    >
                      <Download size={16} />
                    </Button>
                    <Button
                      onClick={(e) => confirmDelete(report.id, e)}
                      variant="ghost"
                      size="sm"
                      className="h-8 w-8 p-0 text-destructive hover:text-destructive/80"
                    >
                      <Trash2 size={16} />
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="recent" className="mt-4">
          <Card className="border border-input">
            <CardContent className="p-6 text-center">
              <FileText className="mx-auto h-12 w-12 mb-4 text-muted-foreground/50" />
              <h3 className="text-lg font-medium mb-2">{t("reports.no_reports")}</h3>
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
        </TabsContent>

        <TabsContent value="favorites" className="mt-4">
          <Card className="border border-input">
            <CardContent className="p-6 text-center">
              <Info className="mx-auto h-12 w-12 mb-4 text-muted-foreground/50" />
              <h3 className="text-lg font-medium mb-2">{t("reports.no_favorites")}</h3>
              <p className="text-muted-foreground">{t("reports.no_favorites_description")}</p>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-destructive" />
              {t("reports.delete_confirm_title")}
            </DialogTitle>
            <DialogDescription>{t("reports.delete_confirm_description")}</DialogDescription>
          </DialogHeader>
          <DialogFooter className="flex justify-end gap-2 mt-4">
            <Button variant="outline" onClick={() => setDeleteDialogOpen(false)} disabled={isDeleting}>
              {t("actions.cancel")}
            </Button>
            <Button variant="destructive" onClick={() => reportToDelete && handleDeleteReport(reportToDelete)} disabled={isDeleting}>
              {isDeleting ? t("reports.deleting") : t("reports.delete")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Reports;