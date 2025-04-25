import React from "react";
import { useAppNavigation } from "../hooks/useAppNavigation";
import { useTranslation } from "../types/language";
import { Breadcrumb, BreadcrumbList, BreadcrumbItem, BreadcrumbSeparator, BreadcrumbCurrent } from "./ui/breadcrumb";
import { Tag, User } from "lucide-react";
import { useAuth } from "./auth/AuthProvider";
import { getCurrentVersion } from "../services/versions";

interface BreadcrumbNavigationProps {
  currentLanguage: string;
  projects: any[];
  customers: any[];
}

const BreadcrumbNavigation: React.FC<BreadcrumbNavigationProps> = ({ currentLanguage, projects, customers }) => {
  const t = useTranslation(currentLanguage);
  const { user } = useAuth();
  const [version, setVersion] = React.useState<string>("0.0.0");
  const [versionType, setVersionType] = React.useState<string>("stable");

  const { view, selectedProjectId, selectedFieldId, selectedZoneId, selectedCustomerId, selectedReportId } = useAppNavigation();

  // Find the selected project, field, and zone
  const selectedProject = projects.find((p) => p.id === selectedProjectId);
  const selectedField = selectedProject?.fields?.find((f) => f.id === selectedFieldId);
  const selectedZone = selectedField?.zones?.find((z) => z.id === selectedZoneId);

  // Find the selected customer
  const selectedCustomer = customers.find((c) => c.id === selectedCustomerId);

  // Load version information
  React.useEffect(() => {
    const loadVersion = async () => {
      try {
        const versionData = await getCurrentVersion();
        if (versionData) {
          setVersion(versionData.version);
          setVersionType(versionData.type || "stable");
        }
      } catch (err) {
        console.error("Error loading version:", err);
        setVersion("0.0.0");
      }
    };

    loadVersion();
  }, []);

  return (
    <div className="h-10 border-b border-input bg-card/50 flex items-center justify-between px-4">
      <Breadcrumb>
        <BreadcrumbList>
          {selectedCustomerId && view !== "customers" && (
            <>
              <BreadcrumbItem>{selectedCustomer?.name || "Customer"}</BreadcrumbItem>
              <BreadcrumbSeparator />
            </>
          )}

          {view !== "customers" && view !== "projects" && selectedProjectId && (
            <>
              <BreadcrumbItem>{selectedProject?.name || "Project"}</BreadcrumbItem>
              <BreadcrumbSeparator />
            </>
          )}

          {view !== "customers" && view !== "projects" && view !== "fields" && selectedFieldId && (
            <>
              <BreadcrumbItem>{selectedField?.name || "Field"}</BreadcrumbItem>
              <BreadcrumbSeparator />
            </>
          )}

          {view !== "customers" && view !== "projects" && view !== "fields" && view !== "zones" && selectedZoneId && (
            <>
              <BreadcrumbItem>{selectedZone?.name || "Zone"}</BreadcrumbItem>
              <BreadcrumbSeparator />
            </>
          )}

          <BreadcrumbItem>
            <BreadcrumbCurrent>{t(`nav.${view}`)}</BreadcrumbCurrent>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>

      <div className="flex items-center gap-4 text-xs text-muted-foreground">
        <div className="flex items-center gap-2">
          <User size={12} className="text-muted-foreground" />
          <span>{user?.email}</span>
        </div>
        <div className="flex items-center gap-2">
          <Tag size={12} className="text-muted-foreground" />
          <span className="font-medium">
            {/* Wrap the version number in an anchor tag */}
            <a
              href="https://github.com/cavort-konzepte-gmbh/pv-corr/blob/main/CHANGELOG.md"
              target="_blank" // Opens the link in a new tab
              rel="noopener noreferrer" // Security best practice for target="_blank"
              className="hover:underline" // Optional: Add underline on hover for better UX
            >
              {version}
            </a>
            {/* The Beta/Stable tag remains outside the link */}
            <span className="ml-1 px-1.5 py-0.5 rounded-full bg-primary/10 text-primary text-[10px]">
              {versionType === "beta" ? "Beta" : "Stable"}
            </span>
          </span>
        </div>
      </div>
    </div>
  );
};

export default BreadcrumbNavigation;
