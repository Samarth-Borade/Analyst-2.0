// src/routes/dataSources.js
const express = require('express');
const router = express.Router();
const authMiddleware = require('../middlewares/authMiddleware');
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

// Get all data sources for a dashboard
router.get('/dashboard/:dashboardId', authMiddleware, async (req, res, next) => {
  try {
    console.log('Fetching data sources for dashboard:', req.params.dashboardId, 'user:', req.user.id);
    const dataSources = await prisma.dataSource.findMany({
      where: {
        dashboardId: req.params.dashboardId,
        userId: req.user.id,
      },
      orderBy: { createdAt: 'desc' },
    });
    console.log('Found', dataSources.length, 'data sources');
    dataSources.forEach((ds, i) => {
      console.log(`  [${i}] ${ds.name}:`);
      console.log(`      id: ${ds.id}`);
      console.log(`      dashboardId: ${ds.dashboardId}`);
      console.log(`      rowCount: ${ds.rowCount}`);
      console.log(`      data type: ${typeof ds.data}`);
      console.log(`      data is null: ${ds.data === null}`);
      console.log(`      data is array: ${Array.isArray(ds.data)}`);
      console.log(`      data length: ${Array.isArray(ds.data) ? ds.data.length : 'N/A'}`);
    });
    res.json(dataSources);
  } catch (error) {
    console.error('Error fetching data sources:', error);
    next(error);
  }
});

// Get single data source with data
router.get('/:id', authMiddleware, async (req, res, next) => {
  try {
    const dataSource = await prisma.dataSource.findFirst({
      where: {
        id: req.params.id,
        userId: req.user.id,
      },
    });

    if (!dataSource) {
      return res.status(404).json({ error: 'Data source not found' });
    }

    res.json(dataSource);
  } catch (error) {
    next(error);
  }
});

// Create or update data source
router.post('/', authMiddleware, async (req, res, next) => {
  try {
    const { dashboardId, name, type, schema, data, rowCount, sourceId, connectionConfig } = req.body;
    
    console.log('Saving data source:', { 
      dashboardId, 
      name, 
      dataLength: Array.isArray(data) ? data.length : 0,
      hasConnectionConfig: !!connectionConfig 
    });

    // Check if a data source with same name exists for this dashboard
    const existing = await prisma.dataSource.findFirst({
      where: {
        dashboardId,
        name,
        userId: req.user.id,
      },
    });

    if (existing) {
      // Update existing data source
      const updated = await prisma.dataSource.update({
        where: { id: existing.id },
        data: {
          type: type || 'csv',
          schema,
          data,
          rowCount: rowCount || (Array.isArray(data) ? data.length : 0),
          connectionConfig: connectionConfig || existing.connectionConfig,
        },
      });
      console.log('Updated existing data source:', updated.id, 'rows:', updated.rowCount);
      return res.json(updated);
    }

    // Create new data source
    const dataSource = await prisma.dataSource.create({
      data: {
        userId: req.user.id,
        dashboardId,
        name,
        type: type || 'csv',
        schema,
        data,
        rowCount: rowCount || (Array.isArray(data) ? data.length : 0),
        connectionConfig: connectionConfig || null,
      },
    });

    console.log('Created new data source:', dataSource.id, 'rows:', dataSource.rowCount);
    res.status(201).json(dataSource);
  } catch (error) {
    console.error('Error saving data source:', error);
    next(error);
  }
});

// Update data source
router.put('/:id', authMiddleware, async (req, res, next) => {
  try {
    const { name, schema, data, rowCount } = req.body;

    const result = await prisma.dataSource.updateMany({
      where: {
        id: req.params.id,
        userId: req.user.id,
      },
      data: {
        name,
        schema,
        data,
        rowCount,
      },
    });

    if (result.count === 0) {
      return res.status(404).json({ error: 'Data source not found' });
    }

    res.json({ message: 'Data source updated' });
  } catch (error) {
    next(error);
  }
});

// Delete data source
router.delete('/:id', authMiddleware, async (req, res, next) => {
  try {
    const result = await prisma.dataSource.deleteMany({
      where: {
        id: req.params.id,
        userId: req.user.id,
      },
    });

    if (result.count === 0) {
      return res.status(404).json({ error: 'Data source not found' });
    }

    res.json({ message: 'Data source deleted' });
  } catch (error) {
    next(error);
  }
});

// Debug endpoint - list all data sources
router.get('/debug/all', authMiddleware, async (req, res, next) => {
  try {
    const all = await prisma.dataSource.findMany({
      where: { userId: req.user.id },
      select: {
        id: true,
        name: true,
        dashboardId: true,
        rowCount: true,
        type: true,
        createdAt: true,
      }
    });
    
    // Also get with data to check if it's stored
    const withData = await prisma.dataSource.findMany({
      where: { userId: req.user.id },
      take: 5,
    });
    
    res.json({
      count: all.length,
      sources: all,
      dataCheck: withData.map(ds => ({
        id: ds.id,
        name: ds.name,
        dataType: typeof ds.data,
        dataIsArray: Array.isArray(ds.data),
        dataLength: Array.isArray(ds.data) ? ds.data.length : null,
        dataPreview: Array.isArray(ds.data) ? ds.data.slice(0, 1) : ds.data,
      }))
    });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
