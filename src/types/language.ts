export type Language = "en" | "de" | "es" | "fr" | "ar";

export interface TranslationMap {
  [key: string]: string | undefined;
}

export const LANGUAGES: { id: Language; name: string; direction: "ltr" | "rtl" }[] = [
  { id: "en", name: "English", direction: "ltr" },
  { id: "de", name: "Deutsch", direction: "ltr" },
  { id: "es", name: "Español", direction: "ltr" },
  { id: "fr", name: "Français", direction: "ltr" },
  { id: "ar", name: "العربية", direction: "rtl" },
];

// Initialize with default fallback translations for critical UI elements
let translations: TranslationMap = {
  // Add some basic fallback translations for critical UI elements
  "nav.customers": "Customers",
  "nav.projects": "Projects",
  "nav.fields": "Fields",
  "nav.zones": "Zones",
  "nav.datapoints": "Datapoints",
  "nav.analyse": "Analyse",
  "nav.output": "Output",
  "nav.settings": "Settings",
  "nav.administration": "Administration",
  "nav.signout": "Sign Out",
  "nav.back": "Back",
  "general.view_on_map": "View on map",
  "general.location_not_set": "Location not set",
  "field.has_fence.yes": "Yes",
  "field.has_fence.no": "No",
  "zones.location": "Location",
  "analysis.create_report": "Create Report",
  "analysis.report_options": "Report Options",
  "analysis.creating_report": "Creating Report...",
  "analysis.preview_report": "Preview Report",
  "analysis.calculation_results": "Calculation Results",
  "analysis.status": "Status",
  "analysis.datapoint_total": "Datapoint Total",
  "analysis.combined_results": "Combined Results",
  "project.latitude": "Latitude",
  "project.longitude": "Longitude",
  "actions.save": "Save",
  "output.no_reports": "No Reports Found",
  "output.no_reports_description": "No reports found. You can create reports in two ways:",
  "output.create_report_instruction_1": "Go to the Analyse section, select datapoints and a norm, then click Create Report",
  "output.create_report_instruction_2": "Preview a report first, then save it permanently",
  "reports.title": "Reports",
  "reports.search": "Search reports...",
  "reports.filter_project": "Filter by project",
  "reports.filter_class": "Filter by class",
  "reports.all_projects": "All Projects",
  "reports.all_classifications": "All Classifications",
  "reports.no_reports": "No Reports Found",
  "reports.no_favorites": "No Favorites Yet",
  "reports.no_favorites_description":
    "You haven't marked any reports as favorites yet. Click the star icon on a report to add it to your favorites.",
  "reports.view_all": "View All Reports",
  "reports.delete": "Delete Report",
  "reports.deleting": "Deleting...",
  "reports.delete_confirm_title": "Delete Report",
  "reports.delete_confirm_description":
    "Are you sure you want to delete this report? This action cannot be undone and will permanently remove the report and all its versions.",
  "reports.rating": "Rating",
  "reports.class": "Class",
  "reports.date": "Date",
  "reports.version": "Version",
  "reports.changelog": "Changelog",
  "reports.tabs.all": "All Reports",
  "reports.tabs.recent": "Recent",
  "reports.tabs.favorites": "Favorites",
  "output.loading": "Loading reports...",
  "output.error": "Error",
  "output.no_data": "No Data",
  "output.select_report": "Please select a report to view",
  "output.print": "Print",
  "output.download_pdf": "Download PDF",
  "output.share": "Share",
  "output.view_history": "View History",
  "output.view_report": "View Report",
  "output.download_report": "Download Report",
  "output.version": "Version",
  "analysis.standard_analysis": "Standard Analysis",
  "actions.cancel": "Cancel",
  "actions.create": "Create",
  "actions.save_changes": "Save Changes",
  datapoints: "Datapoints",
  fields: "Fields",
  zones: "Zones",
  "analysis.norm_specific_results": "Norm-Specific Results",
  "analysis.risk.low": "Low Risk",
  "analysis.risk.medium": "Medium Risk",
  "analysis.risk.high": "High Risk",
  "analysis.stress.very_low": "Very Low Stress",
  "analysis.stress.low": "Low Stress",
  "analysis.stress.medium": "Medium Stress",
  "analysis.stress.high": "High Stress",
  "version.type.alpha": "Alpha",
  "version.type.beta": "Beta",
  "version.type.stable": "Stable",
  "version.changelog": "Changelog",
  "version.changelog.add": "Add Changelog Item",
  "version.changelog.type.feature": "Feature",
  "version.changelog.type.fix": "Fix",
  "version.changelog.type.improvement": "Improvement",
  "version.changelog.type.breaking": "Breaking Change",
  "version.changelog.description": "Description",
  "version.create": "Create Version",
  "version.set_current": "Set as Current",
  "version.link": "Link",
  "version.created": "Created",
  "version.current": "Current",
  "version.actions": "Actions",
  "version.no_changelog": "No changelog entries",
  "common.error": "Error",
  "common.retry": "Retry",
};

export const setTranslations = (newTranslations: TranslationMap) => {
  if (newTranslations && Object.keys(newTranslations).length > 0) {
    // Merge with existing translations rather than replacing
    translations = { ...translations, ...newTranslations };
  }
};

export const useTranslation = (currentLanguage: Language) => {
  return (key: string): string => {
    // Return the translation if it exists, otherwise return the key
    if (!key) return "";
    return translations[key] !== undefined ? (translations[key] as string) : key;
  };
};
