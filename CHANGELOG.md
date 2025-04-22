# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.0.13] - 2025-04-22

### Added

- Added Units in Analyse view
- Added upload Logo in Settings

### Changed

### Fixed

- Error with Datapoint Input

## [1.0.12] - 2025-04-14

### Added

- Added swtich to User View

### Changed

- Moves Toast to bottom-right

### Fixed

- CHANGELOG.md Link behind version number

## [1.0.11] - 2025-04-14

### Added

- Added translation values to the database.
- Added translations to the code for improved internationalization.

### Changed

- Updated styles to improve the UI appearance.
- Changed coordinates to decimal format.

### Fixed

- add/edit/delete Datapoints
- Datalist refresh after add/edit/delete

## [1.0.10] - 2025-04-13

### Added

### Changed

### Fixed

## [1.0.9] - 2025-04-12

### Added

### Changed

### Fixed

## [1.0.8] - 2025-04-12

### Added

### Changed

### Fixed

## [1.0.7] - 2025-04-11

### Added

- Calculations added for several norms
- New RLS policies
- Updated logic overall

### Fixed

- Restructuring data logic
- Calculation errors
- Datapoint fetching issues
- Project creation with new customer

## [1.0.5] - 2025-04-08

### Added

- Coordinate validation and formatting utilities
- Sorting functionality for data tables (materials, experts, foundations, etc.)
- Select all/deselect all functionality for datapoints in analysis

### Fixed

- Version management system with proper database constraints
- Automatic zone creation when creating a new field
- Proper WHERE clauses in version update operations
- Coordinate input validation with helpful error messages
- Database migrations for version management

## [1.0.4] - 2025-04-07

### Added

- Status region implementation for critical notifications
- Optimized data pagination for large datasets
- Conditional field visibility based on user permissions

### Fixed

- Row-level security policy for versions table
- Customer/project assignment validation on first access
- Zone-field relationship integrity constraints
- Timestamp-based sorting functionality for lists
- Query optimization for concurrent user sessions

## [1.0.3] - 2025-04-07

### Added

- Named sorting functionality for data lists
- Entry display order consistency across sessions
- Header color-coding for visual data hierarchy
- Optional unit display in measurement fields
- Enhanced field validation for coordinate data

### Fixed

- Row-level security policy for versions table
- Random customer selection on login sequence
- Automatic filter adaptation with fewer elements
- Login display synchronization issues
- Data structure consistency in project "Llanwern"

## [1.0.2] - 2025-04-07

### Added

- Report deletion functionality
- Datapoint count badges in zone list view
- Field count badges in project view

### Fixed

- Error handling in report creation process

## [1.0.1] - 2025-04-05

### Added

- Support for multiple languages
- Improved error handling in API requests
- Better mobile responsiveness

### Fixed

- Authentication issues with admin users
- Performance optimizations for large datasets

## [1.0.0] - 2025-04-01

### Added

- Initial release
- Project management functionality
- Field and zone management
- Datapoint collection and analysis
- Report generation
- User authentication and authorization
