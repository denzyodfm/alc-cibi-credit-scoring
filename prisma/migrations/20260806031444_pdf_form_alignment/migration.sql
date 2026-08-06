/*
  Warnings:

  - You are about to drop the column `business_top3_customers` on the `income_profiles` table. All the data in the column will be lost.
  - You are about to drop the column `business_top3_suppliers` on the `income_profiles` table. All the data in the column will be lost.
  - You are about to drop the column `crop_production_profile` on the `income_profiles` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE `collateral` ADD COLUMN `date_acquired` DATE NULL;

-- AlterTable
ALTER TABLE `income_profiles` DROP COLUMN `business_top3_customers`,
    DROP COLUMN `business_top3_suppliers`,
    DROP COLUMN `crop_production_profile`,
    ADD COLUMN `accessibility` VARCHAR(40) NULL,
    ADD COLUMN `business_account_number` VARCHAR(80) NULL,
    ADD COLUMN `business_account_type` VARCHAR(80) NULL,
    ADD COLUMN `business_bank_branch` VARCHAR(120) NULL,
    ADD COLUMN `business_depositor_since` VARCHAR(80) NULL,
    ADD COLUMN `buyer_address` TEXT NULL,
    ADD COLUMN `buyer_contact_info` VARCHAR(120) NULL,
    ADD COLUMN `buyer_name` VARCHAR(160) NULL,
    ADD COLUMN `coop_association` VARCHAR(160) NULL,
    ADD COLUMN `deceased_member_account_number` VARCHAR(80) NULL,
    ADD COLUMN `deceased_member_bank_branch` VARCHAR(120) NULL,
    ADD COLUMN `deceased_member_monthly_pension` DECIMAL(14, 2) NULL,
    ADD COLUMN `deceased_member_pension_start` DATE NULL,
    ADD COLUMN `deceased_member_sss_gsis_no` VARCHAR(80) NULL,
    ADD COLUMN `distance_from_residence` VARCHAR(120) NULL,
    ADD COLUMN `employment_status_other` VARCHAR(160) NULL,
    ADD COLUMN `land_characteristics` TEXT NULL,
    ADD COLUMN `land_owner` VARCHAR(160) NULL,
    ADD COLUMN `land_owner_address` TEXT NULL,
    ADD COLUMN `land_tax_declaration` VARCHAR(120) NULL,
    ADD COLUMN `land_tin_no` VARCHAR(80) NULL,
    ADD COLUMN `land_title_no` VARCHAR(120) NULL,
    ADD COLUMN `land_type_of_title` VARCHAR(120) NULL,
    ADD COLUMN `lease_duration` VARCHAR(120) NULL,
    ADD COLUMN `pension_health_risk_assessment` TEXT NULL,
    ADD COLUMN `pension_live_in_partner` VARCHAR(40) NULL,
    ADD COLUMN `pension_proof_of_relationship` TEXT NULL,
    ADD COLUMN `pension_relationship_to` VARCHAR(80) NULL,
    ADD COLUMN `pension_survivor_id` VARCHAR(120) NULL,
    ADD COLUMN `pension_total_years_we_service` DECIMAL(5, 2) NULL,
    ADD COLUMN `planting_arrangement` TEXT NULL,
    ADD COLUMN `rent_amount` DECIMAL(14, 2) NULL,
    ADD COLUMN `rsbsa_registered` VARCHAR(80) NULL,
    ADD COLUMN `sharing_arrangement` TEXT NULL,
    ADD COLUMN `water_reliability` VARCHAR(40) NULL,
    MODIFY `employment_status` VARCHAR(160) NULL,
    MODIFY `farm_risk_assessment` TEXT NULL;

-- CreateTable
CREATE TABLE `business_contacts` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `loan_application_id` INTEGER NOT NULL,
    `kind` VARCHAR(20) NOT NULL,
    `name` VARCHAR(160) NULL,
    `service_product` VARCHAR(160) NULL,
    `contact_info` VARCHAR(160) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    INDEX `business_contacts_loan_application_id_idx`(`loan_application_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `crop_productions` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `loan_application_id` INTEGER NOT NULL,
    `item` VARCHAR(160) NULL,
    `current_season` VARCHAR(120) NULL,
    `last_season` VARCHAR(120) NULL,
    `next_season_estimate` VARCHAR(120) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    INDEX `crop_productions_loan_application_id_idx`(`loan_application_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `farm_cost_items` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `loan_application_id` INTEGER NOT NULL,
    `cost_item` VARCHAR(160) NULL,
    `qty_basis` VARCHAR(120) NULL,
    `cost_per_unit` DECIMAL(14, 2) NULL,
    `total_cost` DECIMAL(14, 2) NULL,
    `remarks` TEXT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    INDEX `farm_cost_items_loan_application_id_idx`(`loan_application_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `attached_properties` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `loan_application_id` INTEGER NOT NULL,
    `tax_declaration_no` VARCHAR(120) NULL,
    `description` TEXT NULL,
    `condition_status` VARCHAR(120) NULL,
    `assessed_value` DECIMAL(14, 2) NULL,
    `appraised_value` DECIMAL(14, 2) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    INDEX `attached_properties_loan_application_id_idx`(`loan_application_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `business_contacts` ADD CONSTRAINT `business_contacts_loan_application_id_fkey` FOREIGN KEY (`loan_application_id`) REFERENCES `loan_applications`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `crop_productions` ADD CONSTRAINT `crop_productions_loan_application_id_fkey` FOREIGN KEY (`loan_application_id`) REFERENCES `loan_applications`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `farm_cost_items` ADD CONSTRAINT `farm_cost_items_loan_application_id_fkey` FOREIGN KEY (`loan_application_id`) REFERENCES `loan_applications`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `attached_properties` ADD CONSTRAINT `attached_properties_loan_application_id_fkey` FOREIGN KEY (`loan_application_id`) REFERENCES `loan_applications`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
