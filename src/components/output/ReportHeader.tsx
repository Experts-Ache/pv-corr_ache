import React from "react";
import { Building2, MapPin } from "lucide-react";
import { useTranslation } from "../../types/language";

interface ReportHeaderProps {
  project: any;
  zone: any;
  norm: any;
  reportId?: string;
  createdAt: string;
  className?: string;
}

const ReportHeader: React.FC<ReportHeaderProps> = ({ project, zone, norm, reportId = "Preview", createdAt, className = "" }) => {
  const t = useTranslation("en");

  return (
    <div className={`mb-8 p-6 rounded-lg border border-input bg-card print:border-black print:border print:p-4 ${className}`}>
      <div className="flex justify-between items-start mb-6">
        <div>
          <h1 className="text-2xl font-bold mb-2 text-foreground print:text-black">{t("analysis.report_title")}</h1>
          <div className="text-sm text-muted-foreground print:text-gray-600 max-w-md">
            {t("analysis.report_subtitle", { standard: norm?.name || "" })}
          </div>
        </div>
        <div className="text-right text-sm text-muted-foreground print:text-gray-600">
          <div>{new Date(createdAt).toLocaleDateString()}</div>
          <div>
            {t("analysis.report_id")}: {reportId}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <h3 className="text-sm font-medium text-muted-foreground mb-2 print:text-gray-600">{t("analysis.project_info")}</h3>
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <Building2 size={14} className="text-accent-primary print:text-black" />
              <span className="text-foreground print:text-black">{project?.name || ""}</span>
            </div>
            <div className="text-sm text-muted-foreground print:text-gray-600">
              {t("project.type")}: {project?.typeProject ? t(`project.type.${project.typeProject}`) : ""}
            </div>
            {project?.clientRef && (
              <div className="text-sm text-muted-foreground print:text-gray-600">
                {t("project.client_ref")}: {project.clientRef}
              </div>
            )}
          </div>
        </div>

        <div>
          <h3 className="text-sm font-medium text-muted-foreground mb-2 print:text-gray-600">{t("analysis.location_info")}</h3>
          <div className="space-y-1">
            <div className="text-foreground print:text-black">{zone?.name || ""}</div>
            {zone?.latitude && zone?.longitude && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground print:text-gray-600">
                <MapPin size={14} />
                <span>
                  {zone.latitude}, {zone.longitude}
                </span>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ReportHeader;
