import React from "react";
import { Theme } from "../../types/theme";
import { Language, useTranslation } from "../../types/language";
import { Datapoint } from "../../types/projects";
import { Check, ArrowUpDown, CheckSquare, Square } from "lucide-react";
import { useState } from "react";
import { Button } from "../ui/button";
import { showToast } from "../../lib/toast";
import { cn } from "@/lib/utils";

interface AnalyseDataProps {
  currentTheme: Theme;
  currentLanguage: Language;
  datapoints: Datapoint[];
  selectedDatapoints: string[];
  onToggleDatapoint: (id: string) => void;
}

type SortField = "name" | "timestamp";
type SortOrder = "asc" | "desc";

const AnalyseData: React.FC<AnalyseDataProps> = ({ currentTheme, currentLanguage, datapoints, selectedDatapoints, onToggleDatapoint }) => {
  const t = useTranslation(currentLanguage);
  const [sortField, setSortField] = useState<SortField>("name");
  const [sortOrder, setSortOrder] = useState<SortOrder>("asc");

  // Get name from datapoint, falling back to id if not available
  const getDatapointName = (datapoint: Datapoint) => {
    return datapoint?.name || datapoint?.id || "Unnamed Datapoint";
  };

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortOrder(sortOrder === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortOrder("asc");
    }
  };

  const sortedDatapoints = [...datapoints].sort((a, b) => {
    // Safely access properties with null checks
    const aValue = sortField === "name" ? (a ? getDatapointName(a).toLowerCase() : "") : a?.timestamp || "";
    const bValue = sortField === "name" ? (b ? getDatapointName(b).toLowerCase() : "") : b?.timestamp || "";

    if (aValue < bValue) return sortOrder === "asc" ? -1 : 1;
    if (aValue > bValue) return sortOrder === "asc" ? 1 : -1;
    return 0;
  });

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-4">
          <h3 className="text-lg font-medium">{t("analysis.select_datapoints")}</h3>
          <Button
            onClick={() => {
              if (selectedDatapoints.length === datapoints.length) {
                // If all are selected, deselect all
                onToggleDatapoint("__deselect_all__");
              } else {
                // Otherwise select all
                onToggleDatapoint("__select_all__");
              }
            }}
            variant="outline"
            size="sm"
            className="flex items-center gap-2"
          >
            {selectedDatapoints.length === datapoints.length ? (
              <>
                <CheckSquare className="h-4 w-4" />
                <span>{t("deselect.all")}</span>
              </>
            ) : (
              <>
                <Square className="h-4 w-4" />
                <span>{t("select.all")}</span>
              </>
            )}
          </Button>
        </div>
        <div className="flex items-center gap-2">
          <Button onClick={() => handleSort("name")} variant={sortField === "name" ? "default" : "outline"}>
            {t("name")}
            <ArrowUpDown size={12} />
          </Button>
          <Button onClick={() => handleSort("timestamp")} variant={sortField === "timestamp" ? "default" : "outline"}>
            {t("date")}

            <ArrowUpDown size={12} />
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-2">
        {sortedDatapoints.map((datapoint) => {
          return datapoint && datapoint.id ? (
            <Button
              key={datapoint.id}
              onClick={() => onToggleDatapoint(datapoint.id)}
              variant="outline"
              className={cn("border-primary hover:bg-primary", {
                "bg-primary hover:bg-primary": selectedDatapoints.includes(datapoint.id),
              })}
            >
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-sm ">{getDatapointName(datapoint)}</div>
                </div>
                {selectedDatapoints.includes(datapoint.id) && <Check size={12} className="text-accent-primary" />}
              </div>
            </Button>
          ) : null;
        })}
      </div>
    </div>
  );
};

export default AnalyseData;
