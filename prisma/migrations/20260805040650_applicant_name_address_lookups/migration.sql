-- AlterTable
ALTER TABLE `applicant_profiles` ADD COLUMN `address_barangay` VARCHAR(160) NULL,
    ADD COLUMN `address_city_municipality` VARCHAR(120) NULL,
    ADD COLUMN `address_province` VARCHAR(120) NULL,
    ADD COLUMN `address_street` VARCHAR(255) NULL,
    ADD COLUMN `first_name` VARCHAR(80) NULL,
    ADD COLUMN `last_name` VARCHAR(80) NULL,
    ADD COLUMN `middle_name` VARCHAR(80) NULL;

-- CreateTable
CREATE TABLE `sex_options` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `label` VARCHAR(60) NOT NULL,
    `is_active` BOOLEAN NOT NULL DEFAULT true,
    `sort_order` INTEGER NOT NULL DEFAULT 0,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    UNIQUE INDEX `sex_options_label_key`(`label`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `civil_status_options` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `label` VARCHAR(60) NOT NULL,
    `is_active` BOOLEAN NOT NULL DEFAULT true,
    `sort_order` INTEGER NOT NULL DEFAULT 0,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    UNIQUE INDEX `civil_status_options_label_key`(`label`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `address_barangays` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `province` VARCHAR(120) NOT NULL,
    `city_municipality` VARCHAR(120) NOT NULL,
    `barangay` VARCHAR(160) NOT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `address_barangays_province_idx`(`province`),
    INDEX `address_barangays_province_city_municipality_idx`(`province`, `city_municipality`),
    UNIQUE INDEX `address_barangays_province_city_municipality_barangay_key`(`province`, `city_municipality`, `barangay`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
