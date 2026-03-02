import type { ExampleResourceDto } from '@/modules/example_resource/dto';

export class ExampleResourceService {
  async list(): Promise<ExampleResourceDto[]> {
    // TODO: Replace placeholder resource behavior with project-specific implementation.
    return [
      {
        id: '50000000-0000-0000-0000-000000000001',
        name: 'example-resource',
      },
    ];
  }
}

export const exampleResourceService = new ExampleResourceService();
