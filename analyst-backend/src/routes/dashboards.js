// src/routes/dashboards.js
const express = require('express');
const router = express.Router();
const authMiddleware = require('../middlewares/authMiddleware');
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

// Get all user dashboards
router.get('/', authMiddleware, async (req, res, next) => {
  try {
    const dashboards = await prisma.dashboard.findMany({
      where: { userId: req.user.id },
      orderBy: { updatedAt: 'desc' },
      select: {
        id: true,
        title: true,
        description: true,
        isPublic: true,
        configuration: true,
        createdAt: true,
        updatedAt: true
      }
    });
    res.json(dashboards);
  } catch (error) {
    next(error);
  }
});

// Get single dashboard
router.get('/:id', authMiddleware, async (req, res, next) => {
  try {
    const dashboard = await prisma.dashboard.findFirst({
      where: {
        id: req.params.id,
        userId: req.user.id
      }
    });

    if (!dashboard) {
      return res.status(404).json({ error: 'Dashboard not found' });
    }

    res.json(dashboard);
  } catch (error) {
    next(error);
  }
});

// Create dashboard
router.post('/', authMiddleware, async (req, res, next) => {
  try {
    const { title, description, promptUsed, configuration } = req.body;

    const dashboard = await prisma.dashboard.create({
      data: {
        userId: req.user.id,
        title,
        description,
        promptUsed,
        configuration: configuration || {}
      }
    });

    res.status(201).json(dashboard);
  } catch (error) {
    next(error);
  }
});

// Update dashboard
router.put('/:id', authMiddleware, async (req, res, next) => {
  try {
    const { title, description, configuration, isPublic } = req.body;

    const dashboard = await prisma.dashboard.updateMany({
      where: {
        id: req.params.id,
        userId: req.user.id
      },
      data: {
        title,
        description,
        configuration,
        isPublic
      }
    });

    if (dashboard.count === 0) {
      return res.status(404).json({ error: 'Dashboard not found' });
    }

    res.json({ message: 'Dashboard updated' });
  } catch (error) {
    next(error);
  }
});

// Delete dashboard
router.delete('/:id', authMiddleware, async (req, res, next) => {
  try {
    const dashboard = await prisma.dashboard.deleteMany({
      where: {
        id: req.params.id,
        userId: req.user.id
      }
    });

    if (dashboard.count === 0) {
      return res.status(404).json({ error: 'Dashboard not found' });
    }

    res.json({ message: 'Dashboard deleted' });
  } catch (error) {
    next(error);
  }
});

module.exports = router;