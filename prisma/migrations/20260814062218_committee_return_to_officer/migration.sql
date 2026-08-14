-- AlterTable
ALTER TABLE `loan_applications` ADD COLUMN `returned_at` DATETIME(3) NULL,
    ADD COLUMN `returned_by` INTEGER NULL,
    ADD COLUMN `returned_from_role` VARCHAR(80) NULL,
    ADD COLUMN `returned_remarks` TEXT NULL;

-- AddForeignKey
ALTER TABLE `loan_applications` ADD CONSTRAINT `loan_applications_returned_by_fkey` FOREIGN KEY (`returned_by`) REFERENCES `users`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
