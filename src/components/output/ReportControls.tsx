import React from "react";
import { ChevronLeft, Printer, Download, FileCheck } from "lucide-react";
import { Button } from "../ui/button";
import { useTranslation } from "../../types/language";
import { showToast } from "../../lib/toast";

interface ReportControlsProps {
  onBack: () => void;
  onSave: () => Promise<void>;
  isSaving: boolean;
  isReportSaved: boolean;
  className?: string;
}

const ReportControls: React.FC<ReportControlsProps> = ({ onBack, onSave, isSaving, isReportSaved, className = "" }) => {
  const t = useTranslation("en");

  return (
    <div className={`flex justify-between items-center mb-6 print:hidden border-b pb-4 ${className}`}>
      <Button onClick={onBack} variant="ghost" size="sm" className="flex items-center gap-2">
        <ChevronLeft size={16} />
        {t("nav.back")}
      </Button>

      <div className="flex items-center gap-2">
        <Button
          onClick={() => showToast("Printing is currently disabled", "error")}
          variant="outline"
          className="flex items-center gap-2"
          title="Print report"
          disabled
        >
          <Printer size={16} />
          <span>{t("output.print")}</span>
        </Button>
        <Button
          onClick={() => showToast("PDF download is currently disabled", "error")}
          variant="outline"
          className="flex items-center gap-2"
          title="Download as PDF"
          disabled
        >
          <Download size={16} />
          <span>{t("output.download_pdf")}</span>
        </Button>
        <Button
          onClick={onSave}
          variant="primary"
          className="flex items-center gap-2 bg-primary text-primary-foreground"
          title="Save as permanent report"
          disabled={isSaving || isReportSaved}
        >
          <FileCheck size={16} />
          <span>{isReportSaved ? "Saved Report" : "Save as Report"}</span>
        </Button>
      </div>
    </div>
  );
};

export default ReportControls;
