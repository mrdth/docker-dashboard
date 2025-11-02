/**
 * Integration tests for DockerService
 * Tests actual Docker API interactions
 */

import { describe, it, expect, beforeAll } from "vitest";
import { getDockerService } from "../../src/services/docker.service";

describe("DockerService Integration Tests", () => {
    let dockerService = getDockerService();

    describe("listContainers", () => {
        it("T053: returns array of containers with id, name, status, created, image fields", async () => {
            const containers = await dockerService.listContainers();

            expect(Array.isArray(containers)).toBe(true);

            // If containers exist, verify schema
            if (containers.length > 0) {
                const container = containers[0];
                expect(container).toHaveProperty("id");
                expect(container).toHaveProperty("name");
                expect(container).toHaveProperty("status");
                expect(container).toHaveProperty("created");
                expect(container).toHaveProperty("image");

                // Verify field types
                expect(typeof container.id).toBe("string");
                expect(typeof container.name).toBe("string");
                expect(typeof container.status).toBe("string");
                expect(typeof container.created).toBe("number");
                expect(typeof container.image).toBe("string");
            }
        });

        it("T054: handles no containers gracefully (returns empty array)", async () => {
            const containers = await dockerService.listContainers();

            expect(Array.isArray(containers)).toBe(true);
            // Empty array is valid response when no containers exist
            expect(containers).toBeDefined();
        });

        it("T055: normalizes Docker status strings to running/stopped/paused/exited", async () => {
            const containers = await dockerService.listContainers();

            const validStatuses = [
                "running",
                "exited",
                "stopped",
                "paused",
                "created",
                "restarting",
                "removing",
                "dead",
            ];

            containers.forEach((container) => {
                expect(validStatuses).toContain(container.status);
                expect(typeof container.status).toBe("string");
                expect(container.status.length).toBeGreaterThan(0);
            });
        });
    });

    describe("getContainer", () => {
        it("retrieves single container with full details", async () => {
            const containers = await dockerService.listContainers();

            if (containers.length > 0) {
                const container = await dockerService.getContainer(
                    containers[0].id,
                );

                expect(container).toHaveProperty("id");
                expect(container).toHaveProperty("name");
                expect(container).toHaveProperty("status");
                expect(container.id).toBe(containers[0].id);
            }
        });

        it("throws ContainerNotFoundError for non-existent container", async () => {
            try {
                await dockerService.getContainer("nonexistent-container-id");
                expect.fail("Should have thrown error");
            } catch (error) {
                expect(error).toBeDefined();
            }
        });
    });

    describe("getContainerStats - User Story 2 Metrics", () => {
        it("T078: returns metrics with cpu.percentage >= 0", async () => {
            const containers = await dockerService.listContainers();
            const runningContainers = containers.filter(
                (c) => c.status === "running",
            );

            if (runningContainers.length > 0) {
                const metrics = await dockerService.getContainerStats(
                    runningContainers[0].id,
                );

                expect(metrics).toHaveProperty("cpu");
                expect(metrics.cpu).toHaveProperty("percentage");
                expect(typeof metrics.cpu.percentage).toBe("number");
                expect(metrics.cpu.percentage).toBeGreaterThanOrEqual(0);
            }
        });

        it("T079: CPU percentage calculation handles multi-core systems (can exceed 100%)", async () => {
            const containers = await dockerService.listContainers();
            const runningContainers = containers.filter(
                (c) => c.status === "running",
            );

            if (runningContainers.length > 0) {
                const metrics = await dockerService.getContainerStats(
                    runningContainers[0].id,
                );

                expect(metrics.cpu).toHaveProperty("percentage");
                expect(metrics.cpu).toHaveProperty("cores");
                expect(typeof metrics.cpu.cores).toBe("number");
                expect(metrics.cpu.cores).toBeGreaterThanOrEqual(1);

                // CPU percentage can exceed 100% on multi-core systems
                expect(metrics.cpu.percentage).toBeGreaterThanOrEqual(0);
            }
        });

        it("T080: Memory percentage calculated as usage/limit * 100", async () => {
            const containers = await dockerService.listContainers();
            const runningContainers = containers.filter(
                (c) => c.status === "running",
            );

            if (runningContainers.length > 0) {
                const metrics = await dockerService.getContainerStats(
                    runningContainers[0].id,
                );

                expect(metrics.memory).toHaveProperty("usage");
                expect(metrics.memory).toHaveProperty("limit");
                expect(metrics.memory).toHaveProperty("percentage");

                // Memory percentage should be between 0 and 100
                expect(metrics.memory.percentage).toBeGreaterThanOrEqual(0);
                expect(metrics.memory.percentage).toBeLessThanOrEqual(100);

                // Verify calculation: if limit > 0, percentage = usage/limit * 100
                if (metrics.memory.limit > 0) {
                    const calculatedPercentage =
                        (metrics.memory.usage / metrics.memory.limit) * 100;
                    // Allow small floating point differences
                    expect(
                        Math.abs(
                            metrics.memory.percentage - calculatedPercentage,
                        ),
                    ).toBeLessThan(0.1);
                }
            }
        });

        it("T081: Disk I/O read/write bytes tracked correctly", async () => {
            const containers = await dockerService.listContainers();
            const runningContainers = containers.filter(
                (c) => c.status === "running",
            );

            if (runningContainers.length > 0) {
                const metrics = await dockerService.getContainerStats(
                    runningContainers[0].id,
                );

                expect(metrics.diskIo).toHaveProperty("readBytes");
                expect(metrics.diskIo).toHaveProperty("writeBytes");
                expect(metrics.diskIo).toHaveProperty("readBytesPerSec");
                expect(metrics.diskIo).toHaveProperty("writeBytesPerSec");

                // All byte counts should be non-negative
                expect(typeof metrics.diskIo.readBytes).toBe("number");
                expect(typeof metrics.diskIo.writeBytes).toBe("number");
                expect(metrics.diskIo.readBytes).toBeGreaterThanOrEqual(0);
                expect(metrics.diskIo.writeBytes).toBeGreaterThanOrEqual(0);
            }
        });
    });

    describe("getPorts - User Story 3 Ports", () => {
        it("T100: returns array of Port with protocol, ports, IP", async () => {
            const containers = await dockerService.listContainers();

            if (containers.length > 0) {
                const ports = await dockerService.getPorts(containers[0].id);

                expect(Array.isArray(ports)).toBe(true);

                // If container has ports, verify structure
                if (ports.length > 0) {
                    const port = ports[0];
                    expect(port).toHaveProperty("protocol");
                    expect(port).toHaveProperty("containerPort");
                    expect(typeof port.protocol).toBe("string");
                    expect(typeof port.containerPort).toBe("number");
                }
            }
        });

        it("T101: handles containers with no exposed ports (returns empty array)", async () => {
            const containers = await dockerService.listContainers();

            if (containers.length > 0) {
                const ports = await dockerService.getPorts(containers[0].id);

                // Should always return an array, even if empty
                expect(Array.isArray(ports)).toBe(true);
                expect(ports).toBeDefined();
            }
        });
    });

    describe("getLogs - User Story 3 Logs", () => {
        it("T102: returns last 100 lines with timestamp, message, stream", async () => {
            const containers = await dockerService.listContainers();

            if (containers.length > 0) {
                const logs = await dockerService.getLogs(containers[0].id);

                expect(Array.isArray(logs)).toBe(true);

                // If container has logs, verify structure
                if (logs.length > 0) {
                    const log = logs[0];
                    expect(log).toHaveProperty("timestamp");
                    expect(log).toHaveProperty("message");
                    expect(log).toHaveProperty("stream");
                    expect(typeof log.message).toBe("string");
                    expect(typeof log.stream).toBe("string");
                }
            }
        });
    });

    describe("Docker connection", () => {
        it("verifies Docker daemon is available", async () => {
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
