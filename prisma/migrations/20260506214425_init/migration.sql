-- CreateTable
CREATE TABLE "Supplier" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "country" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "Product" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "sku" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "supplierId" TEXT NOT NULL,
    "purchasePrice" DECIMAL NOT NULL,
    "marketingCredit" DECIMAL NOT NULL DEFAULT 0,
    "unitsPerCarton" INTEGER,
    "unitOfSale" TEXT NOT NULL DEFAULT 'CARTON',
    "foodCategory" TEXT NOT NULL DEFAULT 'DRY',
    "fragilityClass" INTEGER NOT NULL DEFAULT 2,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "notes" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Product_supplierId_fkey" FOREIGN KEY ("supplierId") REFERENCES "Supplier" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "ProductPhysical" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "productId" TEXT NOT NULL,
    "grossWeightKg" DECIMAL NOT NULL,
    "lengthCm" DECIMAL NOT NULL,
    "widthCm" DECIMAL NOT NULL,
    "heightCm" DECIMAL NOT NULL,
    "cartonsPerLayer" INTEGER,
    "layersPerPallet" INTEGER,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "ProductPhysical_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Customer" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "type" TEXT NOT NULL DEFAULT 'RETAIL',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "OverheadRate" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "fiscalYear" INTEGER NOT NULL,
    "ratePct" DECIMAL NOT NULL,
    "revenueEur" DECIMAL,
    "totalCostEur" DECIMAL,
    "notes" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "CustomerPricing" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "customerId" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "grossPrice" DECIMAL NOT NULL,
    "discount1" DECIMAL NOT NULL DEFAULT 0,
    "discount2" DECIMAL NOT NULL DEFAULT 0,
    "discount3" DECIMAL NOT NULL DEFAULT 0,
    "contractualContribPct" DECIMAL NOT NULL DEFAULT 0,
    "promotionalContribPct" DECIMAL NOT NULL DEFAULT 0,
    "promotionalActivitiesPct" DECIMAL NOT NULL DEFAULT 0,
    "listingFeePct" DECIMAL NOT NULL DEFAULT 0,
    "commissionPct" DECIMAL NOT NULL DEFAULT 0,
    "netNetPrice" DECIMAL NOT NULL,
    "validFrom" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "validTo" DATETIME,
    CONSTRAINT "CustomerPricing_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "CustomerPricing_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Shipment" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "code" TEXT NOT NULL,
    "legType" TEXT NOT NULL,
    "carrier" TEXT NOT NULL,
    "routeFrom" TEXT NOT NULL,
    "routeTo" TEXT NOT NULL,
    "shipmentDate" DATETIME NOT NULL,
    "totalCostEur" DECIMAL NOT NULL,
    "volumetricCoefficient" DECIMAL NOT NULL DEFAULT 250,
    "notes" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "ShipmentLine" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "shipmentId" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "customerId" TEXT,
    "quantityCartons" INTEGER NOT NULL,
    "quantityUnits" INTEGER NOT NULL,
    "realWeightKg" DECIMAL NOT NULL,
    "volumeM3" DECIMAL NOT NULL,
    "volumetricWeightKg" DECIMAL NOT NULL,
    "effectiveWeightKg" DECIMAL NOT NULL,
    "allocatedCostEur" DECIMAL NOT NULL,
    "allocatedCostPerUnitEur" DECIMAL NOT NULL,
    CONSTRAINT "ShipmentLine_shipmentId_fkey" FOREIGN KEY ("shipmentId") REFERENCES "Shipment" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "ShipmentLine_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "ShipmentLine_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "PalletConfig" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "lengthCm" INTEGER NOT NULL DEFAULT 120,
    "widthCm" INTEGER NOT NULL DEFAULT 80,
    "maxHeightCm" INTEGER NOT NULL DEFAULT 180,
    "maxWeightKg" INTEGER NOT NULL DEFAULT 800,
    "isDefault" BOOLEAN NOT NULL DEFAULT false
);

-- CreateTable
CREATE TABLE "AppSetting" (
    "key" TEXT NOT NULL PRIMARY KEY,
    "value" TEXT NOT NULL
);

-- CreateIndex
CREATE UNIQUE INDEX "Supplier_code_key" ON "Supplier"("code");

-- CreateIndex
CREATE UNIQUE INDEX "Product_sku_key" ON "Product"("sku");

-- CreateIndex
CREATE UNIQUE INDEX "ProductPhysical_productId_key" ON "ProductPhysical"("productId");

-- CreateIndex
CREATE UNIQUE INDEX "Customer_name_key" ON "Customer"("name");

-- CreateIndex
CREATE UNIQUE INDEX "OverheadRate_fiscalYear_key" ON "OverheadRate"("fiscalYear");

-- CreateIndex
CREATE UNIQUE INDEX "CustomerPricing_customerId_productId_validFrom_key" ON "CustomerPricing"("customerId", "productId", "validFrom");

-- CreateIndex
CREATE UNIQUE INDEX "Shipment_code_key" ON "Shipment"("code");

-- CreateIndex
CREATE INDEX "ShipmentLine_shipmentId_idx" ON "ShipmentLine"("shipmentId");

-- CreateIndex
CREATE INDEX "ShipmentLine_productId_customerId_idx" ON "ShipmentLine"("productId", "customerId");

-- CreateIndex
CREATE UNIQUE INDEX "PalletConfig_name_key" ON "PalletConfig"("name");
