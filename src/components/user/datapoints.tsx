import React, { useState, useEffect } from "react";
import { Theme } from "../../types/theme";
import { Language, useTranslation } from "../../types/language";
import { Project, Zone } from "../../types/projects";
import { Parameter } from "../../types/parameters";
import ZoneSummary from "./elements/datapoints/ZoneSummary";
import FieldSummary from "./elements/zones/FieldSummary";
import ProjectSummary from "./elements/fields/ProjectSummary";
import ParameterFilter from "./elements/datapoints/ParameterFilter";
import DatapointList from "./elements/datapoints/DatapointList";
import { fetchParameters } from "../../services/parameters";
import { fetchDatapointsByZoneId } from "../../services/datapoints";
import { Person } from "../../types/people";
import { Company } from "../../types/companies";

interface DatapointsProps {
  currentTheme: Theme;
  currentLanguage: Language;
  project?: Project;
  field?: {
    name: string;
    latitude?: string;
    longitude?: string;
  };
  selectedZone?: Zone;
  onBack: () => void;
  onProjectsChange: (projects: Project[]) => void;
  savedPeople?: Person[];
  companies?: Company[];
  selectedCustomerId: string | null;
}

const Datapoints: React.FC<DatapointsProps> = ({
  currentTheme,
  currentLanguage,
  project,
  field,
  selectedZone,
  onBack,
  onProjectsChange,
  savedPeople = [],
  companies = [],
  selectedCustomerId,
}) => {
  const [parameters, setParameters] = useState<Parameter[]>([]);
  const [filteredParameters, setFilteredParameters] = useState<Parameter[]>([]);
  const [showProjectSummary, setShowProjectSummary] = useState(false);
  const [showFieldSummary, setShowFieldSummary] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [zoneDatapoints, setZoneDatapoints] = useState<Datapoint[]>([]);
  const translation = useTranslation(currentLanguage);
  const [dataPointsRefreshKey, setDataPointsRefreshKey] = useState<number>(0);

  useEffect(() => {
    const loadParameters = async () => {
      try {
        setLoading(true);
        const fetchedParams = await fetchParameters();
        setParameters(fetchedParams);
        setFilteredParameters(fetchedParams);
      } catch (err) {
        console.error("Error loading parameters:", err);
        setError("Failed to load parameters");
      } finally {
        setLoading(false);
      }
    };

    loadParameters();
  }, []);

  // Fetch datapoints when zone changes or refresh key changes
  useEffect(() => {
    let isMounted = true;
    const loadDatapoints = async () => {
      if (!selectedZone?.id) return;

      try {
        setLoading(true);
        setError(null);
        const datapoints = await fetchDatapointsByZoneId(selectedZone.id);

        if (isMounted) {
          console.log("Fetched datapoints:", datapoints);
          setZoneDatapoints(datapoints);
        }
      } catch (err) {
        console.error("Error loading datapoints:", err);
        if (isMounted) {
          setError("Failed to load datapoints. Please check your connection and try again.");
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    loadDatapoints();

    return () => {
      isMounted = false;
    };
  }, [selectedZone?.id, dataPointsRefreshKey]); // Add dependencies to prevent infinite re-renders

  if (!project || !field || !selectedZone) {
    return <div className="p-6 text-center text-secondary">{translation("datapoint.please_select_zone")}</div>;
  }

  if (loading) {
    return <div className="p-6 text-center text-secondary">{translation("datapoint.loading_parameters")}</div>;
  }

  if (error) {
    return <div className="p-6 text-center text-accent-primary">{error}</div>;
  }

  return (
    <div className="p-6">
      <ProjectSummary
        isExpanded={showProjectSummary}
        onToggle={() => setShowProjectSummary(!showProjectSummary)}
        project={project}
        manager={savedPeople?.find((p) => p.id === project.managerId)}
        company={companies?.find((c) => c.id === project.companyId)}
        savedPeople={savedPeople || []}
        currentTheme={currentTheme}
        currentLanguage={currentLanguage}
        onProjectsChange={onProjectsChange}
        selectedCustomerId={selectedCustomerId}
      />

      <FieldSummary
        isExpanded={showFieldSummary}
        onToggle={() => setShowFieldSummary(!showFieldSummary)}
        field={field}
        onProjectsChange={onProjectsChange}
        currentTheme={currentTheme}
        currentLanguage={currentLanguage}
      />

      <ZoneSummary
        zone={selectedZone}
        project={project}
        field={field}
        currentTheme={currentTheme}
        currentLanguage={currentLanguage}
        onProjectsChange={(updatedProjects) => {
          onProjectsChange(updatedProjects);
          // Don't trigger refresh here as it causes reload loops
        }}
      />

      <ParameterFilter
        currentTheme={currentTheme}
        currentLanguage={currentLanguage}
        parameters={parameters}
        onParametersChange={setFilteredParameters}
      />

      <DatapointList
        currentTheme={currentTheme}
        currentLanguage={currentLanguage}
        zoneId={selectedZone.id || ""}
        datapoints={zoneDatapoints.length > 0 ? zoneDatapoints : selectedZone.datapoints || []}
        parameters={filteredParameters}
        onProjectsChange={(updatedProjects) => {
          onProjectsChange(updatedProjects);
          // Trigger a refresh of the datapoints list
          setDataPointsRefreshKey((prev) => prev + 1);
        }}
      />
    </div>
  );
};

export default Datapoints;
