-- AlterTable
ALTER TABLE "app_geolocations"
  ADD COLUMN "street"       VARCHAR(200),
  ADD COLUMN "number"       VARCHAR(20),
  ADD COLUMN "complement"   VARCHAR(200),
  ADD COLUMN "neighborhood" VARCHAR(100);
