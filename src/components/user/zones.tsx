import React from "react";
import { Theme } from "../../types/theme";
import { Language, useTranslation } from "../../types/language";
import { Project } from "../../types/projects";
import { Person } from "../../types/people";
import { Company } from "../../types/companies";
import { useState } from "react";
import FieldSummary from "./elements/zones/FieldSummary";
import ProjectSummary from "./elements/fields/ProjectSummary";
import ZoneList from "./elements/zones/ZoneList";
import ZoneForm from "./elements/zones/ZoneForm";

interface ZonesProps {
  currentTheme: Theme;
  currentLanguage: Language;
  projects: Project[];
  onProjectsChange: (projects: Project[]) => void;
  selectedProjectId?: string;
  selectedFieldId?: string;
  onSelectZone: (zoneId: string) => void;
  people: Person[];
  companies: Company[];
}

const Zones: React.FC<ZonesProps> = ({
  currentTheme,
  projects,
  selectedProjectId,
  selectedFieldId,
  onSelectZone,
  people,
  companies,
  onProjectsChange,
  currentLanguage,
}) => {
  const transition = useTranslation(currentLanguage);

  // Safely find the selected project with error handling
  const selectedProject = (() => {
    try {
      if (!selectedProjectId || !projects || !Array.isArray(projects)) return null;
      return projects.find((p) => p && p.id === selectedProjectId) || null;
    } catch (err) {
      console.error("Error finding selected project:", err);
      return null;
    }
  })();

  // Safely find the selected field with error handling
  const selectedField = (() => {
    try {
      if (!selectedProject || !selectedFieldId || !selectedProject.fields || !Array.isArray(selectedProject.fields)) return null;
      return selectedProject.fields.find((f) => f && f.id === selectedFieldId) || null;
    } catch (err) {
      console.error("Error finding selected field:", err);
      return null;
    }
  })();

  // Safely find manager and company with error handling
  const manager = (() => {
    try {
      if (!selectedProject || !people || !Array.isArray(people) || !selectedProject.managerId) return null;
      return people.find((person) => person && person.id === selectedProject.managerId) || null;
    } catch (err) {
      console.error("Error finding manager:", err);
      return null;
    }
  })();

  const company = (() => {
    try {
      if (!selectedProject || !companies || !Array.isArray(companies) || !selectedProject.companyId) return null;
      return companies.find((company) => company && company.id === selectedProject.companyId) || null;
    } catch (err) {
      console.error("Error finding company:", err);
      return null;
    }
  })();

  if (!selectedProject || !selectedField) {
    return <div className="p-6 text-center">{transition("zones.please_select_field")}</div>;
  }

  const [showProjectSummary, setShowProjectSummary] = useState(false);

  return (
    <div className="p-6">
      <ProjectSummary
        project={selectedProject}
        manager={manager}
        company={company}
        currentTheme={currentTheme}
        currentLanguage={currentLanguage}
        savedPeople={people}
        isExpanded={showProjectSummary}
        onToggle={() => setShowProjectSummary(!showProjectSummary)}
        onProjectsChange={onProjectsChange}
        selectedCustomerId={selectedProject?.companyId || null}
      />

      <FieldSummary
        field={selectedField}
        currentTheme={currentTheme}
        currentLanguage={currentLanguage}
        onProjectsChange={onProjectsChange}
      />

      <ZoneList
        currentTheme={currentTheme}
        zones={selectedField.zones && Array.isArray(selectedField.zones) ? selectedField.zones : []}
        selectedFieldId={selectedField.id}
        onSelectZone={onSelectZone}
        onProjectsChange={onProjectsChange}
        currentLanguage={currentLanguage}
      />
    </div>
  );
};

export default Zones;