CREATE TABLE "MetricSnapshot" (
    "id" TEXT NOT NULL,
    "scope" TEXT NOT NULL,
    "target" TEXT NOT NULL,
    "databaseId" TEXT,
    "cpuPercent" DOUBLE PRECISION,
    "memoryUsageBytes" BIGINT,
    "memoryLimitBytes" BIGINT,
    "memoryPercent" DOUBLE PRECISION,
    "netInputBytes" BIGINT,
    "netOutputBytes" BIGINT,
    "blockInputBytes" BIGINT,
    "blockOutputBytes" BIGINT,
    "diskTotalBytes" BIGINT,
    "diskUsedBytes" BIGINT,
    "diskFreeBytes" BIGINT,
    "diskUsedPercent" DOUBLE PRECISION,
    "fileSizeBytes" BIGINT,
    "uptimeSeconds" BIGINT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MetricSnapshot_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "MetricSnapshot_scope_target_createdAt_idx" ON "MetricSnapshot"("scope", "target", "createdAt");
CREATE INDEX "MetricSnapshot_databaseId_createdAt_idx" ON "MetricSnapshot"("databaseId", "createdAt");
