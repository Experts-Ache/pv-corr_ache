import React from "react";
import { useTranslation } from "../../types/language";

interface ReportMethodologyProps {
  norm: any;
  className?: string;
}

const ReportMethodology: React.FC<ReportMethodologyProps> = ({ norm, className = "" }) => {
  const t = useTranslation("en");
  
  return (
    <div className={`mb-8 p-6 rounded-lg border border-input bg-card print:border-black print:border print:p-4 ${className}`}>
      <h2 className="text-lg font-medium text-foreground mb-4 print:text-black">{t("analysis.methodology")}</h2>
      <div className="space-y-4 text-sm text-muted-foreground print:text-gray-600">
        <p>{t("analysis.methodology_description")}</p>
        <div>
          <strong>{t("analysis.standard_reference")}:</strong>
          <div>{norm?.name || ""}</div>
          {norm?.description && <div>{norm.description}</div>}
        </div>
      </div>
    </div>
  );
};

export default ReportMethodology;