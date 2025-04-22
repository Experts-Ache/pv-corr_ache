import React, { useState, useEffect } from "react";
import { Theme } from "../../types/theme";
import { Database } from "lucide-react";

interface DatabaseOverviewProps {
  currentTheme: Theme;
}

const DatabaseOverview: React.FC<DatabaseOverviewProps> = ({ currentTheme }) => {
  return (
    <div className="p-6">
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <Database className="mx-auto h-16 w-16 text-muted-foreground mb-4" />
          <h3 className="text-xl font-medium mb-2">Database Management</h3>
          <p className="text-muted-foreground">
            Select a category from the options above to manage database records.
          </p>
        </div>
      </div>
    </div>
  );
};

export default DatabaseOverview;
