// src/routes/versions.js
const express = require('express');
const router = express.Router();
const authMiddleware = require('../middlewares/authMiddleware');
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

/**
 * Get all versions for a dashboard
 * GET /api/versions/:dashboardId
 */
router.get('/:dashboardId', authMiddleware, async (req, res, next) => {
  try {
    const { dashboardId } = req.params;

    // Verify user owns the dashboard
    const dashboard = await prisma.dashboard.findFirst({
      where: {
        id: dashboardId,
        userId: req.user.id
      }
    });

    if (!dashboard) {
      return res.status(404).json({ error: 'Dashboard not found' });
    }

    const versions = await prisma.dashboardVersion.findMany({
      where: { dashboardId },
      orderBy: { versionNumber: 'desc' },
      select: {
        id: true,
        versionNumber: true,
        title: true,
        description: true,
        commitMessage: true,
        createdByEmail: true,
        createdAt: true
      }
    });

    res.json(versions);
  } catch (error) {
    next(error);
  }
});

/**
 * Get a specific version
 * GET /api/versions/:dashboardId/:versionId
 */
router.get('/:dashboardId/:versionId', authMiddleware, async (req, res, next) => {
  try {
    const { dashboardId, versionId } = req.params;

    // Verify user owns the dashboard
    const dashboard = await prisma.dashboard.findFirst({
      where: {
        id: dashboardId,
        userId: req.user.id
      }
    });

    if (!dashboard) {
      return res.status(404).json({ error: 'Dashboard not found' });
    }

    const version = await prisma.dashboardVersion.findFirst({
      where: {
        id: versionId,
        dashboardId
      }
    });

    if (!version) {
      return res.status(404).json({ error: 'Version not found' });
    }

    res.json(version);
  } catch (error) {
    next(error);
  }
});

/**
 * Create a new version (save current state)
 * POST /api/versions/:dashboardId
 * 
 * Body can include:
 * - commitMessage: string (optional)
 * - configuration: object (optional - current dashboard state from frontend)
 * - title: string (optional - dashboard title)
 * 
 * If configuration is provided and dashboard doesn't exist, it will be created.
 */
router.post('/:dashboardId', authMiddleware, async (req, res, next) => {
  try {
    const { dashboardId } = req.params;
    const { commitMessage, configuration, title } = req.body;

    // Get the dashboard
    let dashboard = await prisma.dashboard.findFirst({
      where: {
        id: dashboardId,
        userId: req.user.id
      }
    });

    // If dashboard doesn't exist but we have configuration, create it
    if (!dashboard && configuration) {
      console.log('Dashboard not found, creating new one with provided configuration');
      dashboard = await prisma.dashboard.create({
        data: {
          id: dashboardId, // Use the same ID from frontend
          userId: req.user.id,
          title: title || 'Untitled Dashboard',
          description: '',
          configuration: configuration,
          isPublic: false
        }
      });
      console.log('Created new dashboard:', dashboard.id);
    }

    if (!dashboard) {
      return res.status(404).json({ error: 'Dashboard not found. Please provide configuration to create it.' });
    }

    // Get the latest version number
    const latestVersion = await prisma.dashboardVersion.findFirst({
      where: { dashboardId: dashboard.id },
      orderBy: { versionNumber: 'desc' },
      select: { versionNumber: true }
    });

    const newVersionNumber = (latestVersion?.versionNumber || 0) + 1;

    // Use provided configuration or dashboard's current configuration
    const configToSave = configuration || dashboard.configuration;

    // Create the new version
    const version = await prisma.dashboardVersion.create({
      data: {
        dashboardId: dashboard.id,
        versionNumber: newVersionNumber,
        title: dashboard.title,
        description: dashboard.description,
        configuration: configToSave,
        commitMessage: commitMessage || `Version ${newVersionNumber}`,
        createdByUserId: req.user.id,
        createdByEmail: req.user.email
      }
    });

    // Also update the dashboard with the latest configuration
    if (configuration) {
      await prisma.dashboard.update({
        where: { id: dashboard.id },
        data: { configuration }
      });
    }

    res.status(201).json({
      message: 'Version saved successfully',
      version: {
        id: version.id,
        versionNumber: version.versionNumber,
        commitMessage: version.commitMessage,
        createdAt: version.createdAt
      },
      dashboardId: dashboard.id // Return the dashboard ID (might be new)
    });
  } catch (error) {
    next(error);
  }
});

/**
 * Restore a version (rollback)
 * POST /api/versions/:dashboardId/:versionId/restore
 */
router.post('/:dashboardId/:versionId/restore', authMiddleware, async (req, res, next) => {
  try {
    const { dashboardId, versionId } = req.params;
    const { saveCurrentFirst } = req.body; // Option to save current state before restoring

    // Verify user owns the dashboard
    const dashboard = await prisma.dashboard.findFirst({
      where: {
        id: dashboardId,
        userId: req.user.id
      }
    });

    if (!dashboard) {
      return res.status(404).json({ error: 'Dashboard not found' });
    }

    // Get the version to restore
    const versionToRestore = await prisma.dashboardVersion.findFirst({
      where: {
        id: versionId,
        dashboardId
      }
    });

    if (!versionToRestore) {
      return res.status(404).json({ error: 'Version not found' });
    }

    // Optionally save current state before restoring
    if (saveCurrentFirst) {
      const latestVersion = await prisma.dashboardVersion.findFirst({
        where: { dashboardId },
        orderBy: { versionNumber: 'desc' },
        select: { versionNumber: true }
      });

      const newVersionNumber = (latestVersion?.versionNumber || 0) + 1;

      await prisma.dashboardVersion.create({
        data: {
          dashboardId,
          versionNumber: newVersionNumber,
          title: dashboard.title,
          description: dashboard.description,
          configuration: dashboard.configuration,
          commitMessage: `Auto-save before restoring to v${versionToRestore.versionNumber}`,
          createdByUserId: req.user.id,
          createdByEmail: req.user.email
        }
      });
    }

    // Update the dashboard with the version's configuration
    await prisma.dashboard.update({
      where: { id: dashboardId },
      data: {
        title: versionToRestore.title,
        description: versionToRestore.description,
        configuration: versionToRestore.configuration
      }
    });

    // Create a new version to mark the restore
    const latestVersionAfter = await prisma.dashboardVersion.findFirst({
      where: { dashboardId },
      orderBy: { versionNumber: 'desc' },
      select: { versionNumber: true }
    });

    const restoreVersionNumber = (latestVersionAfter?.versionNumber || 0) + 1;

    const restoreVersion = await prisma.dashboardVersion.create({
      data: {
        dashboardId,
        versionNumber: restoreVersionNumber,
        title: versionToRestore.title,
        description: versionToRestore.description,
        configuration: versionToRestore.configuration,
        commitMessage: `Restored from version ${versionToRestore.versionNumber}`,
        createdByUserId: req.user.id,
        createdByEmail: req.user.email
      }
    });

    res.json({
      message: `Successfully restored to version ${versionToRestore.versionNumber}`,
      newVersion: {
        id: restoreVersion.id,
        versionNumber: restoreVersion.versionNumber,
        commitMessage: restoreVersion.commitMessage,
        createdAt: restoreVersion.createdAt
      },
      restoredConfiguration: versionToRestore.configuration
    });
  } catch (error) {
    next(error);
  }
});

/**
 * Compare two versions
 * GET /api/versions/:dashboardId/compare/:versionId1/:versionId2
 */
router.get('/:dashboardId/compare/:versionId1/:versionId2', authMiddleware, async (req, res, next) => {
  try {
    const { dashboardId, versionId1, versionId2 } = req.params;

    // Verify user owns the dashboard
    const dashboard = await prisma.dashboard.findFirst({
      where: {
        id: dashboardId,
        userId: req.user.id
      }
    });

    if (!dashboard) {
      return res.status(404).json({ error: 'Dashboard not found' });
    }

    const [version1, version2] = await Promise.all([
      prisma.dashboardVersion.findFirst({
        where: { id: versionId1, dashboardId }
      }),
      prisma.dashboardVersion.findFirst({
        where: { id: versionId2, dashboardId }
      })
    ]);

    if (!version1 || !version2) {
      return res.status(404).json({ error: 'One or both versions not found' });
    }

    // Calculate differences
    const config1 = version1.configuration;
    const config2 = version2.configuration;

    const diff = {
      version1: {
        id: version1.id,
        versionNumber: version1.versionNumber,
        title: version1.title,
        createdAt: version1.createdAt,
        pageCount: config1?.pages?.length || 0,
        chartCount: config1?.pages?.reduce((sum, p) => sum + (p.charts?.length || 0), 0) || 0
      },
      version2: {
        id: version2.id,
        versionNumber: version2.versionNumber,
        title: version2.title,
        createdAt: version2.createdAt,
        pageCount: config2?.pages?.length || 0,
        chartCount: config2?.pages?.reduce((sum, p) => sum + (p.charts?.length || 0), 0) || 0
      },
      changes: {
        titleChanged: version1.title !== version2.title,
        pagesAdded: (config2?.pages?.length || 0) - (config1?.pages?.length || 0),
        chartsAdded: (config2?.pages?.reduce((sum, p) => sum + (p.charts?.length || 0), 0) || 0) -
                     (config1?.pages?.reduce((sum, p) => sum + (p.charts?.length || 0), 0) || 0)
      }
    };

    res.json(diff);
  } catch (error) {
    next(error);
  }
});

/**
 * Delete a version
 * DELETE /api/versions/:dashboardId/:versionId
 */
router.delete('/:dashboardId/:versionId', authMiddleware, async (req, res, next) => {
  try {
    const { dashboardId, versionId } = req.params;

    // Verify user owns the dashboard
    const dashboard = await prisma.dashboard.findFirst({
      where: {
        id: dashboardId,
        userId: req.user.id
      }
    });

    if (!dashboard) {
      return res.status(404).json({ error: 'Dashboard not found' });
    }

    // Don't allow deleting the only version
    const versionCount = await prisma.dashboardVersion.count({
      where: { dashboardId }
    });

    if (versionCount <= 1) {
      return res.status(400).json({ error: 'Cannot delete the only version' });
    }

    const deleted = await prisma.dashboardVersion.deleteMany({
      where: {
        id: versionId,
        dashboardId
      }
    });

    if (deleted.count === 0) {
      return res.status(404).json({ error: 'Version not found' });
    }

    res.json({ message: 'Version deleted successfully' });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
