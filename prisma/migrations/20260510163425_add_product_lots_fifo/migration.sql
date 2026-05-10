-- CreateTable
CREATE TABLE "ProductLot" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "productId" TEXT NOT NULL,
    "lotNumber" TEXT NOT NULL,
    "expiryDate" DATETIME,
    "quantityReceived" INTEGER NOT NULL,
    "quantityAvailable" INTEGER NOT NULL,
    "receivedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "sourceOrderId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "ProductLot_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "ProductLot_sourceOrderId_fkey" FOREIGN KEY ("sourceOrderId") REFERENCES "Order" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_OrderLine" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "orderId" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "quantityOrdered" INTEGER NOT NULL,
    "quantityPrepared" INTEGER NOT NULL DEFAULT 0,
    "lotNumber" TEXT,
    "lotId" TEXT,
    "isPrepared" BOOLEAN NOT NULL DEFAULT false,
    "notes" TEXT,
    CONSTRAINT "OrderLine_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "OrderLine_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "OrderLine_lotId_fkey" FOREIGN KEY ("lotId") REFERENCES "ProductLot" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_OrderLine" ("id", "isPrepared", "lotNumber", "notes", "orderId", "productId", "quantityOrdered", "quantityPrepared") SELECT "id", "isPrepared", "lotNumber", "notes", "orderId", "productId", "quantityOrdered", "quantityPrepared" FROM "OrderLine";
DROP TABLE "OrderLine";
ALTER TABLE "new_OrderLine" RENAME TO "OrderLine";
CREATE INDEX "OrderLine_orderId_idx" ON "OrderLine"("orderId");
CREATE INDEX "OrderLine_lotId_idx" ON "OrderLine"("lotId");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE INDEX "ProductLot_productId_expiryDate_idx" ON "ProductLot"("productId", "expiryDate");

-- CreateIndex
CREATE UNIQUE INDEX "ProductLot_productId_lotNumber_key" ON "ProductLot"("productId", "lotNumber");
