ALTER TABLE `loan_applications`
  MODIFY `status` ENUM('DRAFT','CI_BI_IN_PROGRESS','FOR_SCORECARD','AUTO_DENIED','FOR_ENDORSEMENT','ENDORSED','FOR_CREDIT_COMMITTEE','PROCEED','APPROVED','DENIED','CANCELLED') NOT NULL DEFAULT 'DRAFT',
  ADD COLUMN `loan_purpose_category` VARCHAR(40) NULL,
  ADD COLUMN `ao_client_remarks` TEXT NULL,
  ADD COLUMN `endorsed_by` INTEGER NULL,
  ADD COLUMN `endorsed_at` DATETIME(3) NULL,
  ADD COLUMN `endorsement_code` VARCHAR(40) NULL,
  ADD COLUMN `endorsement_remarks` TEXT NULL,
  ADD INDEX `loan_applications_endorsed_by_idx` (`endorsed_by`),
  ADD CONSTRAINT `loan_applications_endorsed_by_fkey` FOREIGN KEY (`endorsed_by`) REFERENCES `users` (`id`) ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE `credit_committee_reviews`
  ADD COLUMN `approval_code` VARCHAR(40) NULL,
  ADD COLUMN `recommended_amount` DECIMAL(14,2) NULL,
  ADD COLUMN `recommended_terms` INTEGER NULL;

CREATE TABLE `loan_requirements` (
  `id` INTEGER NOT NULL AUTO_INCREMENT,
  `loan_application_id` INTEGER NOT NULL,
  `requirement_type` VARCHAR(80) NOT NULL,
  `label` VARCHAR(160) NOT NULL,
  `status` VARCHAR(30) NOT NULL DEFAULT 'PENDING',
  `document_data_url` LONGTEXT NULL,
  `document_mime_type` VARCHAR(80) NULL,
  `file_name` VARCHAR(255) NULL,
  `details` JSON NULL,
  `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updated_at` DATETIME(3) NOT NULL,
  UNIQUE INDEX `loan_requirements_loan_application_id_requirement_type_key` (`loan_application_id`,`requirement_type`),
  INDEX `loan_requirements_loan_application_id_idx` (`loan_application_id`),
  PRIMARY KEY (`id`),
  CONSTRAINT `loan_requirements_loan_application_id_fkey` FOREIGN KEY (`loan_application_id`) REFERENCES `loan_applications` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `loan_section_remarks` (
  `id` INTEGER NOT NULL AUTO_INCREMENT,
  `loan_application_id` INTEGER NOT NULL,
  `section_key` VARCHAR(50) NOT NULL,
  `ao_remarks` TEXT NULL,
  `committee_remarks` TEXT NULL,
  `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updated_at` DATETIME(3) NOT NULL,
  UNIQUE INDEX `loan_section_remarks_loan_application_id_section_key_key` (`loan_application_id`,`section_key`),
  INDEX `loan_section_remarks_loan_application_id_idx` (`loan_application_id`),
  PRIMARY KEY (`id`),
  CONSTRAINT `loan_section_remarks_loan_application_id_fkey` FOREIGN KEY (`loan_application_id`) REFERENCES `loan_applications` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `loan_computations` (
  `id` INTEGER NOT NULL AUTO_INCREMENT,
  `loan_application_id` INTEGER NOT NULL,
  `outstanding_balance` DECIMAL(14,2) NULL,
  `recommended_amount` DECIMAL(14,2) NULL,
  `interest_rate` DECIMAL(7,3) NULL,
  `service_fee` DECIMAL(14,2) NULL,
  `insurance` DECIMAL(14,2) NULL,
  `documentary_stamp` DECIMAL(14,2) NULL,
  `notarial_fee` DECIMAL(14,2) NULL,
  `other_charges` DECIMAL(14,2) NULL,
  `net_proceeds` DECIMAL(14,2) NULL,
  `monthly_amortization` DECIMAL(14,2) NULL,
  `collection_type` VARCHAR(80) NULL,
  `loan_type` VARCHAR(80) NULL,
  `source_of_repayment` VARCHAR(160) NULL,
  `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updated_at` DATETIME(3) NOT NULL,
  UNIQUE INDEX `loan_computations_loan_application_id_key` (`loan_application_id`),
  PRIMARY KEY (`id`),
  CONSTRAINT `loan_computations_loan_application_id_fkey` FOREIGN KEY (`loan_application_id`) REFERENCES `loan_applications` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
