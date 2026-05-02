export type MigrationStatus = 'migrated' | 'legacy';

export interface RouteMigrationInfo {
  routeName: string;
  status: MigrationStatus;
  isMigrated: boolean;
}
