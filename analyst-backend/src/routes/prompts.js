// src/routes/prompts.js
const express = require('express');
const router = express.Router();
const authMiddleware = require('../middlewares/authMiddleware');
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

// Submit a new prompt
router.post('/', authMiddleware, async (req, res, next) => {
  try {
    const { promptText } = req.body;

    if (!promptText || promptText.trim().length === 0) {
      return res.status(400).json({ error: 'Prompt text is required' });
    }

    // Create prompt with pending status
    const prompt = await prisma.prompt.create({
      data: {
        userId: req.user.id,
        promptText: promptText.trim(),
        status: 'pending'
      }
    });

    // TODO: Queue this prompt for processing by your AI service
    // This is where you'd integrate with your dashboard generation logic
    // For now, we'll just return the prompt

    res.status(201).json({
      message: 'Prompt submitted successfully',
      prompt: {
        id: prompt.id,
        promptText: prompt.promptText,
        status: prompt.status,
        createdAt: prompt.createdAt
      }
    });
  } catch (error) {
    next(error);
  }
});

// Get prompt history
router.get('/history', authMiddleware, async (req, res, next) => {
  try {
    const { limit = 20, offset = 0 } = req.query;

    const prompts = await prisma.prompt.findMany({
      where: { userId: req.user.id },
      orderBy: { createdAt: 'desc' },
      take: parseInt(limit),
      skip: parseInt(offset),
      include: {
        dashboard: {
          select: {
            id: true,
            title: true
          }
        }
      }
    });

    const total = await prisma.prompt.count({
      where: { userId: req.user.id }
    });

    res.json({
      prompts,
      pagination: {
        total,
        limit: parseInt(limit),
        offset: parseInt(offset)
      }
    });
  } catch (error) {
    next(error);
  }
});

// Get prompt status
router.get('/:id/status', authMiddleware, async (req, res, next) => {
  try {
    const prompt = await prisma.prompt.findFirst({
      where: {
        id: req.params.id,
        userId: req.user.id
      },
      select: {
        id: true,
        status: true,
        processingTime: true,
        errorMessage: true,
        dashboardId: true
      }
    });

    if (!prompt) {
      return res.status(404).json({ error: 'Prompt not found' });
    }

    res.json(prompt);
  } catch (error) {
    next(error);
  }
});

// Update prompt status (internal use - typically called by your AI processing service)
router.put('/:id/status', authMiddleware, async (req, res, next) => {
  try {
    const { status, dashboardId, processingTime, errorMessage } = req.body;

    const prompt = await prisma.prompt.updateMany({
      where: {
        id: req.params.id,
        userId: req.user.id
      },
      data: {
        status,
        dashboardId,
        processingTime,
        errorMessage
      }
    });

    if (prompt.count === 0) {
      return res.status(404).json({ error: 'Prompt not found' });
    }

    res.json({ message: 'Prompt status updated' });
  } catch (error) {
    next(error);
  }
});

module.exports = router;