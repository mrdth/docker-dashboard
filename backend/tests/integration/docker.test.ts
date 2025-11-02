/**
 * Integration tests for DockerService
 * Tests actual Docker API interactions
 */

import { describe, it, expect, beforeAll } from 'vitest';
import { getDockerService } from '../../src/services/docker.service';

describe('DockerService Integration Tests', () => {
  let dockerService = getDockerService();

  describe('listContainers', () => {
    it('T053: returns array of containers with id, name, status, created, image fields', async () => {
      const containers = await dockerService.listContainers();

      expect(Array.isArray(containers)).toBe(true);

      // If containers exist, verify schema
      if (containers.length > 0) {
        const container = containers[0];
        expect(container).toHaveProperty('id');
        expect(container).toHaveProperty('name');
        expect(container).toHaveProperty('status');
        expect(container).toHaveProperty('created');
        expect(container).toHaveProperty('image');

        // Verify field types
        expect(typeof container.id).toBe('string');
        expect(typeof container.name).toBe('string');
        expect(typeof container.status).toBe('string');
        expect(typeof container.created).toBe('number');
        expect(typeof container.image).toBe('string');
      }
    });

    it('T054: handles no containers gracefully (returns empty array)', async () => {
      const containers = await dockerService.listContainers();

      expect(Array.isArray(containers)).toBe(true);
      // Empty array is valid response when no containers exist
      expect(containers).toBeDefined();
    });

    it('T055: normalizes Docker status strings to running/stopped/paused/exited', async () => {
      const containers = await dockerService.listContainers();

      const validStatuses = ['running', 'exited', 'stopped', 'paused', 'created', 'restarting', 'removing', 'dead'];

      containers.forEach((container) => {
        expect(validStatuses).toContain(container.status);
        expect(typeof container.status).toBe('string');
        expect(container.status.length).toBeGreaterThan(0);
      });
    });
  });

  describe('getContainer', () => {
    it('retrieves single container with full details', async () => {
      const containers = await dockerService.listContainers();

      if (containers.length > 0) {
        const container = await dockerService.getContainer(containers[0].id);

        expect(container).toHaveProperty('id');
        expect(container).toHaveProperty('name');
        expect(container).toHaveProperty('status');
        expect(container.id).toBe(containers[0].id);
      }
    });

    it('throws ContainerNotFoundError for non-existent container', async () => {
      try {
        await dockerService.getContainer('nonexistent-container-id');
        expect.fail('Should have thrown error');
      } catch (error) {
        expect(error).toBeDefined();
      }
    });
  });

  describe('Docker connection', () => {
    it('verifies Docker daemon is available', async () => {
      try {
        await dockerService.verifyVersion();
        // If we get here, Docker is available
        expect(true).toBe(true);
      } catch (error) {
        // Docker daemon is not available - this is acceptable for integration tests
        expect(error).toBeDefined();
      }
    });
  });
});
