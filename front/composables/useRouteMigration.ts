import type { MigrationStatus, RouteMigrationInfo } from '~/types/migration';

export const useRouteMigration = (routeName?: string): RouteMigrationInfo => {
  const appConfig = useAppConfig();
  const route = useRoute();
  const resolvedRouteName = routeName || String(route.name || '');
  const status =
    (appConfig.migration?.routes?.[resolvedRouteName] as MigrationStatus | undefined) || 'legacy';

  return {
    routeName: resolvedRouteName,
    status,
    isMigrated: status === 'migrated',
  };
};
