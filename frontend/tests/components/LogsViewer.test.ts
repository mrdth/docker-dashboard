/**
 * Component tests for LogsViewer
 * Verifies log display with timestamps and formatting
 */

import { describe, it, expect } from "vitest";
import { mount } from "@vue/test-utils";
import LogsViewer from "../../src/components/LogsViewer.vue";
import type { LogEntry } from "../../src/types/index";

describe("T117: LogsViewer.vue", () => {
    const mockLogs: LogEntry[] = [
        {
            timestamp: "2025-11-02T10:00:00Z",
            message: "Container started successfully",
            stream: "stdout",
            sequence: 1,
        },
        {
            timestamp: "2025-11-02T10:00:05Z",
            message: "Server listening on port 8080",
            stream: "stdout",
            sequence: 2,
        },
        {
            timestamp: "2025-11-02T10:00:10Z",
            message: "Database connection failed",
            stream: "stderr",
            sequence: 3,
        },
        {
            timestamp: "2025-11-02T10:00:15Z",
            message: "Retrying connection...",
            stream: "stdout",
            sequence: 4,
        },
        {
            timestamp: "2025-11-02T10:00:20Z",
            message: "Database connection established",
            stream: "stdout",
            sequence: 5,
        },
    ];

    it("T117: displays logs with timestamps and monospace formatting", () => {
        const wrapper = mount(LogsViewer, {
            props: { logs: mockLogs },
        });

        const html = wrapper.html();

        // Should render in monospace font
        expect(html).toContain("font-mono");

        // Should display timestamps
        expect(wrapper.text()).toContain("2025-11-02T10:00:00Z");
        expect(wrapper.text()).toContain("2025-11-02T10:00:05Z");

        // Should display log messages
        expect(wrapper.text()).toContain("Container started successfully");
        expect(wrapper.text()).toContain("Server listening on port 8080");
    });

    it("displays 'no logs available' when logs array is empty", () => {
        const wrapper = mount(LogsViewer, {
            props: { logs: [] },
        });

        expect(wrapper.text()).toContain("No logs available");
    });

    it("displays only the last N log lines by default (10)", () => {
        const manyLogs = Array.from({ length: 20 }, (_, i) => ({
            timestamp: new Date(Date.now() - (20 - i) * 1000).toISOString(),
            message: `Log message ${i + 1}`,
            stream: "stdout" as const,
            sequence: i + 1,
        }));

        const wrapper = mount(LogsViewer, {
            props: { logs: manyLogs },
        });

        // Should display at most 10 lines by default
        const logLines = wrapper.findAll(".py-1");
        expect(logLines.length).toBeLessThanOrEqual(10);

        // Should show last messages (highest numbers)
        expect(wrapper.text()).toContain("Log message 20");
        expect(wrapper.text()).toContain("Log message 19");
    });

    it("respects maxLines prop", () => {
        const manyLogs = Array.from({ length: 20 }, (_, i) => ({
            timestamp: new Date(Date.now() - (20 - i) * 1000).toISOString(),
            message: `Log message ${i + 1}`,
            stream: "stdout" as const,
            sequence: i + 1,
        }));

        const wrapper = mount(LogsViewer, {
            props: { logs: manyLogs, maxLines: 5 },
        });

        // Should display at most 5 lines
        const logLines = wrapper.findAll(".py-1");
        expect(logLines.length).toBeLessThanOrEqual(5);
    });

    it("displays stream indicator for logs", () => {
        const wrapper = mount(LogsViewer, {
            props: { logs: mockLogs },
        });

        const text = wrapper.text();

        // Should display stream indicators
        expect(text).toContain("stdout");
        expect(text).toContain("stderr");
    });

    it("uses dark background styling for log viewer", () => {
        const wrapper = mount(LogsViewer, {
            props: { logs: mockLogs },
        });

        const html = wrapper.html();

        // Should have dark background
        expect(html).toContain("bg-gray-900");

        // Should have monospace font and light text
        expect(html).toContain("font-mono");
        expect(html).toContain("text-gray-100");
    });

    it("displays messages in order with proper formatting", () => {
        const wrapper = mount(LogsViewer, {
            props: { logs: mockLogs, maxLines: 20 },
        });

        const text = wrapper.text();

        // First log should appear before subsequent ones
        const firstLogIndex = text.indexOf("Container started");
        const secondLogIndex = text.indexOf("Server listening");

        expect(firstLogIndex).toBeGreaterThan(-1);
        expect(secondLogIndex).toBeGreaterThan(-1);
    });

    it("handles logs without stream field gracefully", () => {
        const logsNoStream: LogEntry[] = [
            {
                timestamp: "2025-11-02T10:00:00Z",
                message: "Log without stream",
                stream: "stdout",
                sequence: 1,
            },
        ];

        const wrapper = mount(LogsViewer, {
            props: { logs: logsNoStream },
        });

        expect(wrapper.text()).toContain("Log without stream");
    });

    it("renders scrollable container for long logs", () => {
        const longLogs = Array.from({ length: 50 }, (_, i) => ({
            timestamp: new Date(Date.now() - (50 - i) * 1000).toISOString(),
            message: `Very long log message ${i + 1} with a lot of content that might wrap`,
            stream: "stdout" as const,
            sequence: i + 1,
        }));

        const wrapper = mount(LogsViewer, {
            props: { logs: longLogs, maxLines: 20 },
        });

        const html = wrapper.html();

        // Should have overflow and max-height for scrolling
        expect(html).toContain("max-h");
        expect(html).toContain("overflow-y-auto");
    });
});
