import { closeDatabase, connectDatabase } from '@/common/database/connection';

export { closeDatabase };
export {
  initializeModels,
  setupAssociations,
} from '@/common/database/associations';

export const bootstrapDatabase = async (): Promise<void> => {
  await connectDatabase();
};
