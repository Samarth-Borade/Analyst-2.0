import { getUsageStats, getUsageLog, clearUsageLog, getCacheStats, clearStatisticsCache } from "@/lib/llm-utils";

export async function GET() {
  const stats = getUsageStats();
  const cacheStats = getCacheStats();
  const recentLog = getUsageLog().slice(-10); // Last 10 requests
  
  return Response.json({
    stats,
    cache: cacheStats,
    recentRequests: recentLog.map(log => ({
      ...log,
      timestamp: new Date(log.timestamp).toISOString(),
    })),
  });
}

export async function DELETE(req: Request) {
  const { searchParams } = new URL(req.url);
  const target = searchParams.get('target');
  
  if (target === 'usage') {
    clearUsageLog();
    return Response.json({ message: 'Usage log cleared' });
  }
  
  if (target === 'cache') {
    clearStatisticsCache();
    return Response.json({ message: 'Statistics cache cleared' });
  }
  
  if (target === 'all') {
    clearUsageLog();
    clearStatisticsCache();
    return Response.json({ message: 'All caches cleared' });
  }
  
  return Response.json(
    { error: 'Invalid target. Use ?target=usage, ?target=cache, or ?target=all' },
    { status: 400 }
  );
}
