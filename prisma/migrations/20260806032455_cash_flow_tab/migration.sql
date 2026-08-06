-- CreateTable
CREATE TABLE `cash_flow_entries` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `loan_application_id` INTEGER NOT NULL,
    `entry_type` VARCHAR(20) NOT NULL,
    `description` VARCHAR(200) NULL,
    `amount` DECIMAL(14, 2) NULL,
    `frequency` VARCHAR(40) NULL,
    `income` DECIMAL(14, 2) NULL,
    `expense` DECIMAL(14, 2) NULL,
    `sort_order` INTEGER NOT NULL DEFAULT 0,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    INDEX `cash_flow_entries_loan_application_id_idx`(`loan_application_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `cash_flow_entries` ADD CONSTRAINT `cash_flow_entries_loan_application_id_fkey` FOREIGN KEY (`loan_application_id`) REFERENCES `loan_applications`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
