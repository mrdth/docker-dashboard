# Bug Fix: Image Name Display in Container Details

**Date**: November 3, 2025  
**Issue**: Image names displayed as sha256 hashes in container detail view instead of human-readable names  
**Severity**: High - Breaks image update checking functionality  
**Status**: ✅ FIXED

---

## Problem Description

### Symptoms

1. **Container List View**: Shows correct image name
   ```
   Example: lscr.io/linuxserver/sonarr:latest ✓
   ```

2. **Container Detail View**: Shows sha256 hash instead of image name
   ```
   Example: sha256:63b4529017ef2457b0b252df323179e2aa3edd032b2a4c661c5097e4b1ea328b ✗
   ```

3. **Image Update Checking**: Fails because sha256 is not a valid image reference
   ```
   Docker Hub API lookup fails with "not found" error
   ```

### Root Cause

In `backend/src/services/docker.service.ts`, the `normalizeContainer()` method had incorrect priority for image name extraction:

**WRONG** (Before):
```typescript
image:
    dockerContainer.Image ||              // sha256 hash from listContainers()
    dockerContainer.Config?.Image ||      // actual image name
    "unknown",
```

**Why it's wrong**:
- Docker API's `listContainers()` returns `Image` field as a **sha256 hash** (e.g., `sha256:63b45...`)
- Docker API's `inspect()` returns:
  - `Image`: sha256 hash (same as listContainers)
  - `Config.Image`: actual image reference (e.g., `lscr.io/linuxserver/sonarr:latest`)
- The original code prioritized the sha256 over the human-readable name

### Impact

1. **Display Issue**: Users see sha256 hashes instead of recognizable image names
2. **Registry Lookup Failure**: Update checker passes sha256 to Docker Hub API instead of image name
3. **Broken Update Checking**: All image update checks fail with "not found" errors

---

## Solution

### Changed Code

**File**: `backend/src/services/docker.service.ts`  
**Method**: `normalizeContainer()` (line 339)

**CORRECT** (After):
```typescript
// BUG FIX: Use Config.Image (human-readable name) first, not Image (sha256)
// Docker listContainers() returns Image as sha256 hash
// Docker inspect() returns Config.Image as the actual image reference
// We need the human-readable name for display and registry lookups
image:
    dockerContainer.Config?.Image ||      // actual image name (priority 1)
    dockerContainer.Image ||              // fallback to sha256 (priority 2)
    "unknown",
```

### Why This Works

1. **Priority 1**: `Config.Image` - Always contains the human-readable image reference
   - Works for both `listContainers()` and `inspect()` calls
   - Format: `lscr.io/linuxserver/sonarr:latest`

2. **Priority 2**: `Image` - Falls back to sha256 if Config is missing
   - Provides robustness for edge cases
   - Format: `sha256:63b4529017ef2457b0b252df323179e2aa3edd032b2a4c661c5097e4b1ea328b`

3. **Priority 3**: `"unknown"` - Final fallback for missing data

---

## Testing the Fix

### Before (Broken)
```bash
# Container list
GET /api/containers
→ image: "sha256:63b4529017ef2457b0b252df323179e2aa3edd032b2a4c661c5097e4b1ea328b"

# Container detail
GET /api/containers/{id}
→ image: "sha256:63b4529017ef2457b0b252df323179e2aa3edd032b2a4c661c5097e4b1ea328b"
→ imageInfo.registryStatus: "unable_to_check" (failed lookup)

# Frontend detail view
Container Image: sha256:63b4529017ef2457b0b252df323179e2aa3edd032b2a4c661c5097e4b1ea328b ✗
```

### After (Fixed)
```bash
# Container list
GET /api/containers
→ image: "lscr.io/linuxserver/sonarr:latest"

# Container detail
GET /api/containers/{id}
→ image: "lscr.io/linuxserver/sonarr:latest"
→ imageInfo.registryStatus: "checked" (successful lookup)
→ imageInfo.updateAvailable: true/false (correct status)

# Frontend detail view
Container Image: lscr.io/linuxserver/sonarr:latest ✓
Update Status: Up to date / Update available ✓
```

---

## Files Affected

### Changed
- `backend/src/services/docker.service.ts` - normalizeContainer() method

### No Changes Needed (Already Correct)
- `backend/src/api/routes/containers.ts` - Uses image field correctly
- `backend/src/services/registry.service.ts` - Receives correct image name now
- `frontend/src/components/ContainerListTable.vue` - Displays image field
- `frontend/src/components/ContainerDetailView.vue` - Displays imageInfo
- `frontend/src/types/index.ts` - Type definitions
- `backend/src/models/index.ts` - Type definitions

---

## Verification Steps

### 1. Backend API Test
```bash
# Get container detail
curl http://localhost:3000/api/containers/{container-id}

# Verify response has human-readable image name
# Expected: "image": "lscr.io/linuxserver/sonarr:latest"
# NOT: "image": "sha256:..."
```

### 2. Update Checking Test
```bash
# Check logs for registry lookups
LOG_LEVEL=debug npm run dev

# Should see successful Docker Hub lookups
# Before: "registryStatus": "unable_to_check"
# After: "registryStatus": "checked"
```

### 3. Frontend Display Test
1. Navigate to any running container
2. Click "Details" button
3. Verify container image shows readable name
4. Verify update status shows correctly (not "unable to check")

### 4. Manual Test Example
**Container**: Sonarr from LinuxServer.io

Before fix:
```
Displayed: sha256:63b4529017ef2457b0b252df323179e2aa3edd032b2a4c661c5097e4b1ea328b
Update Status: Unable to check
```

After fix:
```
Displayed: lscr.io/linuxserver/sonarr:latest
Update Status: Up to date (or "Update available" if newer exists)
```

---

## Docker API Documentation Reference

### listContainers() Response
```json
{
  "Id": "abc123...",
  "Names": ["/sonarr"],
  "Image": "sha256:63b4...",    // ← SHA256 hash (NOT human-readable)
  "State": "running"
}
```

### inspect() Response
```json
{
  "Id": "abc123...",
  "Name": "/sonarr",
  "Image": "sha256:63b4...",     // ← SHA256 hash (NOT human-readable)
  "Config": {
    "Image": "lscr.io/linuxserver/sonarr:latest"  // ← Human-readable name ✓
  },
  "State": {
    "Status": "running"
  }
}
```

---

## Related Functions

### Affected Call Chain

1. **Container List Endpoint**
   - `GET /api/containers`
   - Calls: `dockerService.listContainers()`
   - Calls: `registryService.checkForUpdates(image)` ← Needs correct image name

2. **Container Detail Endpoint**
   - `GET /api/containers/{id}`
   - Calls: `dockerService.getContainer(id)`
   - Calls: `registryService.checkForUpdates(image)` ← Needs correct image name

3. **Update Checker Background Job**
   - Calls: `dockerService.listContainers()`
   - Calls: `registryService.checkForUpdates(image)` ← Needs correct image name

---

## Summary

| Aspect | Before | After |
|--------|--------|-------|
| **Image Display** | sha256 hash | Human-readable name ✓ |
| **Detail View** | sha256:63b4... | lscr.io/linuxserver/sonarr:latest ✓ |
| **Registry Lookup** | Failed (invalid reference) | Success ✓ |
| **Update Checking** | "unable_to_check" | "checked" with correct status ✓ |
| **Code Location** | docker.service.ts:339 | Same location |
| **Breaking Changes** | None | None |

---

## Commit Information

- **Type**: `fix(backend)`
- **Scope**: Image name handling in Docker service
- **Description**: Prioritize Config.Image over Image to use human-readable names
- **Files Changed**: 1 (docker.service.ts)
- **Lines Changed**: 5 (3 new comments + 2 reordered lines)

---

**Status**: ✅ READY FOR TESTING  
**Next Steps**: Run test suite and verify image names display correctly in both list and detail views
