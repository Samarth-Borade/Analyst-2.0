// src/routes/users.js
const express = require('express');
const router = express.Router();
const authMiddleware = require('./auth');
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

// Get user profile
router.get('/profile', authMiddleware, async (req, res, next) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
      select: {
        id: true,
        email: true,
        fullName: true,
        createdAt: true,
        lastLogin: true,
        preferences: true
      }
    });
    res.json(user);
  } catch (error) {
    next(error);
  }
});

// Update user profile
router.put('/profile', authMiddleware, async (req, res, next) => {
  try {
    const { fullName } = req.body;
    
    const user = await prisma.user.update({
      where: { id: req.user.id },
      data: { fullName },
      select: {
        id: true,
        email: true,
        fullName: true
      }
    });
    
    res.json({ message: 'Profile updated', user });
  } catch (error) {
    next(error);
  }
});

// Update user preferences
router.put('/preferences', authMiddleware, async (req, res, next) => {
  try {
    const { theme, defaultChartType, timezone, notificationsEnabled } = req.body;
    
    const preferences = await prisma.userPreference.upsert({
      where: { userId: req.user.id },
      update: {
        theme,
        defaultChartType,
        timezone,
        notificationsEnabled
      },
      create: {
        userId: req.user.id,
        theme,
        defaultChartType,
        timezone,
        notificationsEnabled
      }
    });
    
    res.json({ message: 'Preferences updated', preferences });
  } catch (error) {
    next(error);
  }
});

module.exports = router;