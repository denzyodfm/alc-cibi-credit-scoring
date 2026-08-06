/*
  Warnings:

  - Added the required column `region` to the `address_barangays` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE `address_barangays` ADD COLUMN `region` VARCHAR(120) NOT NULL;

-- AlterTable
ALTER TABLE `applicant_profiles` ADD COLUMN `address_region` VARCHAR(120) NULL,
    ADD COLUMN `permanent_address_barangay` VARCHAR(160) NULL,
    ADD COLUMN `permanent_address_city_municipality` VARCHAR(120) NULL,
    ADD COLUMN `permanent_address_province` VARCHAR(120) NULL,
    ADD COLUMN `permanent_address_region` VARCHAR(120) NULL,
    ADD COLUMN `permanent_address_street` VARCHAR(255) NULL,
    ADD COLUMN `permanent_same_as_current` BOOLEAN NOT NULL DEFAULT false;

-- CreateTable
CREATE TABLE `residence_type_options` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `label` VARCHAR(60) NOT NULL,
    `is_active` BOOLEAN NOT NULL DEFAULT true,
    `sort_order` INTEGER NOT NULL DEFAULT 0,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    UNIQUE INDEX `residence_type_options_label_key`(`label`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateIndex
CREATE INDEX `address_barangays_region_idx` ON `address_barangays`(`region`);
