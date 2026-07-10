-- CreateTable
CREATE TABLE `branches` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `branch_code` VARCHAR(20) NOT NULL,
    `branch_name` VARCHAR(120) NOT NULL,
    `branch_address` VARCHAR(255) NULL,
    `is_head_office` BOOLEAN NOT NULL DEFAULT false,
    `status` ENUM('ACTIVE', 'INACTIVE') NOT NULL DEFAULT 'ACTIVE',
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    UNIQUE INDEX `branches_branch_code_key`(`branch_code`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `branch_staff_assignments` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `branch_id` INTEGER NOT NULL,
    `user_id` INTEGER NOT NULL,
    `staff_role` ENUM('HEAD_OFFICE_TEAM_LEADER', 'AREA_TEAM_LEADER', 'BRANCH_TEAM_LEADER', 'CASHIER', 'BOOKKEEPER', 'ACCOUNT_OFFICER') NOT NULL,
    `active_from` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `active_to` DATETIME(3) NULL,
    `is_active` BOOLEAN NOT NULL DEFAULT true,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    INDEX `branch_staff_assignments_branch_id_idx`(`branch_id`),
    INDEX `branch_staff_assignments_user_id_idx`(`user_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `users` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `employee_no` VARCHAR(50) NOT NULL,
    `full_name` VARCHAR(160) NOT NULL,
    `email` VARCHAR(160) NOT NULL,
    `username` VARCHAR(80) NOT NULL,
    `password_hash` VARCHAR(255) NOT NULL,
    `branch_id` INTEGER NOT NULL,
    `role` ENUM('SUPER_ADMIN', 'HEAD_OFFICE_ADMIN', 'HEAD_OFFICE_CREDIT_COMMITTEE', 'AREA_TEAM_LEADER', 'BRANCH_TEAM_LEADER', 'ACCOUNT_OFFICER', 'CASHIER', 'BOOKKEEPER', 'VIEWER') NOT NULL,
    `status` ENUM('ACTIVE', 'INACTIVE') NOT NULL DEFAULT 'ACTIVE',
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    UNIQUE INDEX `users_employee_no_key`(`employee_no`),
    UNIQUE INDEX `users_email_key`(`email`),
    UNIQUE INDEX `users_username_key`(`username`),
    INDEX `users_branch_id_idx`(`branch_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `loan_applications` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `application_no` VARCHAR(40) NOT NULL,
    `ci_form_no` VARCHAR(40) NULL,
    `date_of_ci` DATETIME(3) NULL,
    `loan_officer_id` INTEGER NOT NULL,
    `branch_id` INTEGER NOT NULL,
    `branch_code` VARCHAR(20) NOT NULL,
    `loan_purpose` TEXT NULL,
    `loan_product` VARCHAR(120) NULL,
    `amount_applied` DECIMAL(14, 2) NOT NULL DEFAULT 0,
    `desired_terms` VARCHAR(120) NULL,
    `proposed_amortization` DECIMAL(14, 2) NULL,
    `status` ENUM('DRAFT', 'CI_BI_IN_PROGRESS', 'FOR_SCORECARD', 'AUTO_DENIED', 'FOR_CREDIT_COMMITTEE', 'PROCEED', 'APPROVED', 'DENIED', 'CANCELLED') NOT NULL DEFAULT 'DRAFT',
    `created_by` INTEGER NOT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    UNIQUE INDEX `loan_applications_application_no_key`(`application_no`),
    UNIQUE INDEX `loan_applications_ci_form_no_key`(`ci_form_no`),
    INDEX `loan_applications_branch_id_idx`(`branch_id`),
    INDEX `loan_applications_branch_code_idx`(`branch_code`),
    INDEX `loan_applications_application_no_idx`(`application_no`),
    INDEX `loan_applications_ci_form_no_idx`(`ci_form_no`),
    INDEX `loan_applications_created_by_idx`(`created_by`),
    INDEX `loan_applications_loan_officer_id_idx`(`loan_officer_id`),
    INDEX `loan_applications_status_idx`(`status`),
    INDEX `loan_applications_date_of_ci_idx`(`date_of_ci`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `applicant_profiles` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `loan_application_id` INTEGER NOT NULL,
    `full_name` VARCHAR(160) NOT NULL,
    `nickname` VARCHAR(80) NULL,
    `place_of_birth` VARCHAR(160) NULL,
    `date_of_birth` DATETIME(3) NULL,
    `age` INTEGER NULL,
    `sex` VARCHAR(30) NULL,
    `civil_status` VARCHAR(50) NULL,
    `current_address` TEXT NULL,
    `years_at_address` DECIMAL(5, 2) NULL,
    `permanent_address` TEXT NULL,
    `residence_type` VARCHAR(80) NULL,
    `monthly_rent_or_mortgage` DECIMAL(14, 2) NULL,
    `contact_number` VARCHAR(60) NULL,
    `alternate_contact` VARCHAR(60) NULL,
    `email` VARCHAR(160) NULL,
    `alternate_email` VARCHAR(160) NULL,
    `gcash_number` VARCHAR(60) NULL,
    `facebook` VARCHAR(160) NULL,
    `twitter` VARCHAR(160) NULL,
    `tiktok` VARCHAR(160) NULL,
    `instagram` VARCHAR(160) NULL,
    `tin_no` VARCHAR(80) NULL,
    `sss_id` VARCHAR(80) NULL,
    `gsis_id` VARCHAR(80) NULL,
    `philhealth_no` VARCHAR(80) NULL,
    `pagibig_no` VARCHAR(80) NULL,
    `drivers_license` VARCHAR(80) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    UNIQUE INDEX `applicant_profiles_loan_application_id_key`(`loan_application_id`),
    INDEX `applicant_profiles_loan_application_id_idx`(`loan_application_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `household_backgrounds` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `loan_application_id` INTEGER NOT NULL,
    `spouse_partner_name` VARCHAR(160) NULL,
    `spouse_nickname` VARCHAR(80) NULL,
    `spouse_current_address` TEXT NULL,
    `spouse_years_at_address` DECIMAL(5, 2) NULL,
    `spouse_occupation_employer` VARCHAR(160) NULL,
    `spouse_employer_address` TEXT NULL,
    `spouse_monthly_income` DECIMAL(14, 2) NULL,
    `number_of_dependents` INTEGER NULL,
    `dependents_under_18` INTEGER NULL,
    `father_name` VARCHAR(160) NULL,
    `father_dob_dod_age` VARCHAR(120) NULL,
    `father_occupation` VARCHAR(160) NULL,
    `mother_name` VARCHAR(160) NULL,
    `mother_dob_dod_age` VARCHAR(120) NULL,
    `mother_occupation` VARCHAR(160) NULL,
    `parent_address` TEXT NULL,
    `is_primary_income_earner` BOOLEAN NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    UNIQUE INDEX `household_backgrounds_loan_application_id_key`(`loan_application_id`),
    INDEX `household_backgrounds_loan_application_id_idx`(`loan_application_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `income_profiles` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `loan_application_id` INTEGER NOT NULL,
    `employment_status` VARCHAR(80) NULL,
    `employer_name` VARCHAR(160) NULL,
    `position_designation` VARCHAR(120) NULL,
    `employment_type` VARCHAR(80) NULL,
    `company_address` TEXT NULL,
    `length_of_service` VARCHAR(80) NULL,
    `hr_supervisor_name_contact` VARCHAR(180) NULL,
    `gross_monthly_salary` DECIMAL(14, 2) NULL,
    `net_monthly_take_home_pay` DECIMAL(14, 2) NULL,
    `bank_branch` VARCHAR(120) NULL,
    `account_number` VARCHAR(80) NULL,
    `notes` TEXT NULL,
    `pension_type` VARCHAR(100) NULL,
    `pension_monthly_amount` DECIMAL(14, 2) NULL,
    `pension_start_date` DATETIME(3) NULL,
    `ofw_status` VARCHAR(80) NULL,
    `country_of_deployment` VARCHAR(120) NULL,
    `ofw_company_name` VARCHAR(160) NULL,
    `nature_of_work` VARCHAR(160) NULL,
    `hiring_type` VARCHAR(80) NULL,
    `job_title` VARCHAR(120) NULL,
    `industry` VARCHAR(120) NULL,
    `contract_start_date` DATETIME(3) NULL,
    `contract_end_date` DATETIME(3) NULL,
    `monthly_salary_foreign` DECIMAL(14, 2) NULL,
    `monthly_salary_php` DECIMAL(14, 2) NULL,
    `remittance_frequency` VARCHAR(80) NULL,
    `business_name` VARCHAR(160) NULL,
    `business_address` TEXT NULL,
    `business_registration_no` VARCHAR(120) NULL,
    `nature_of_business` VARCHAR(160) NULL,
    `years_of_operations` DECIMAL(5, 2) NULL,
    `average_monthly_gross_revenue` DECIMAL(14, 2) NULL,
    `average_monthly_net_income` DECIMAL(14, 2) NULL,
    `farming_type` VARCHAR(120) NULL,
    `main_product` VARCHAR(120) NULL,
    `farmer_type` VARCHAR(80) NULL,
    `farm_location` VARCHAR(180) NULL,
    `years_of_experience` DECIMAL(5, 2) NULL,
    `area_cultivated` VARCHAR(120) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    UNIQUE INDEX `income_profiles_loan_application_id_key`(`loan_application_id`),
    INDEX `income_profiles_loan_application_id_idx`(`loan_application_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `existing_liabilities` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `loan_application_id` INTEGER NOT NULL,
    `creditor` VARCHAR(160) NOT NULL,
    `purpose` VARCHAR(160) NULL,
    `original_amount` DECIMAL(14, 2) NULL,
    `outstanding_balance` DECIMAL(14, 2) NULL,
    `monthly_obligation` DECIMAL(14, 2) NULL,
    `due_date` DATETIME(3) NULL,
    `loan_status` VARCHAR(80) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    INDEX `existing_liabilities_loan_application_id_idx`(`loan_application_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `character_references` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `loan_application_id` INTEGER NOT NULL,
    `reference_name` VARCHAR(160) NOT NULL,
    `relationship` VARCHAR(100) NULL,
    `contact_no` VARCHAR(60) NULL,
    `key_feedback` TEXT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    INDEX `character_references_loan_application_id_idx`(`loan_application_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `assets` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `loan_application_id` INTEGER NOT NULL,
    `asset_type` VARCHAR(80) NOT NULL,
    `description` TEXT NULL,
    `condition_status` VARCHAR(80) NULL,
    `estimated_value` DECIMAL(14, 2) NULL,
    `owned_by` VARCHAR(160) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    INDEX `assets_loan_application_id_idx`(`loan_application_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `collateral` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `loan_application_id` INTEGER NOT NULL,
    `collateral_type` VARCHAR(100) NULL,
    `registered_owner` VARCHAR(160) NULL,
    `title_no` VARCHAR(120) NULL,
    `tax_declaration_no` VARCHAR(120) NULL,
    `location` TEXT NULL,
    `area` VARCHAR(120) NULL,
    `declared_value` DECIMAL(14, 2) NULL,
    `assessed_value` DECIMAL(14, 2) NULL,
    `market_value` DECIMAL(14, 2) NULL,
    `appraised_value` DECIMAL(14, 2) NULL,
    `date_last_appraised` DATETIME(3) NULL,
    `land_classification` VARCHAR(120) NULL,
    `vehicle_cr_no` VARCHAR(120) NULL,
    `vehicle_or_no` VARCHAR(120) NULL,
    `vehicle_model` VARCHAR(120) NULL,
    `vehicle_make` VARCHAR(120) NULL,
    `vehicle_color` VARCHAR(80) NULL,
    `vehicle_type` VARCHAR(80) NULL,
    `chassis_no` VARCHAR(120) NULL,
    `engine_no` VARCHAR(120) NULL,
    `expiry_date` DATETIME(3) NULL,
    `notes` TEXT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    INDEX `collateral_loan_application_id_idx`(`loan_application_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `scorecard_settings` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `category` VARCHAR(40) NOT NULL,
    `weight_percent` DECIMAL(6, 2) NOT NULL,
    `is_active` BOOLEAN NOT NULL DEFAULT true,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    UNIQUE INDEX `scorecard_settings_category_key`(`category`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `scorecard_criteria` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `category` VARCHAR(40) NOT NULL,
    `code` VARCHAR(10) NOT NULL,
    `name` VARCHAR(160) NOT NULL,
    `question_guide` TEXT NOT NULL,
    `score_descriptions` JSON NOT NULL,
    `na_treatment` ENUM('NEVER_NA', 'EXCLUDE_RENORMALIZE', 'ASSIGN_NEUTRAL_2', 'ASSIGN_FIXED_1', 'ASSIGN_FIXED_2', 'ASSIGN_FIXED_4') NOT NULL,
    `auto_dq_if_zero` BOOLEAN NOT NULL DEFAULT false,
    `sort_order` INTEGER NOT NULL,
    `is_active` BOOLEAN NOT NULL DEFAULT true,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    UNIQUE INDEX `scorecard_criteria_code_key`(`code`),
    INDEX `scorecard_criteria_category_idx`(`category`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `credit_scorecards` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `loan_application_id` INTEGER NOT NULL,
    `character_score` DECIMAL(6, 2) NOT NULL DEFAULT 0,
    `capacity_score` DECIMAL(6, 2) NOT NULL DEFAULT 0,
    `capital_score` DECIMAL(6, 2) NOT NULL DEFAULT 0,
    `collateral_score` DECIMAL(6, 2) NOT NULL DEFAULT 0,
    `conditions_score` DECIMAL(6, 2) NOT NULL DEFAULT 0,
    `overall_score` DECIMAL(6, 2) NOT NULL DEFAULT 0,
    `result` ENUM('AUTO_DENIED', 'DENIED', 'FOR_CREDIT_COMMITTEE', 'PROCEED') NOT NULL,
    `auto_dq_triggered` BOOLEAN NOT NULL DEFAULT false,
    `auto_dq_reason` TEXT NULL,
    `recommendation_notes` TEXT NULL,
    `scored_by` INTEGER NULL,
    `scored_at` DATETIME(3) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    UNIQUE INDEX `credit_scorecards_loan_application_id_key`(`loan_application_id`),
    INDEX `credit_scorecards_loan_application_id_idx`(`loan_application_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `credit_scorecard_items` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `scorecard_id` INTEGER NOT NULL,
    `category` VARCHAR(40) NOT NULL,
    `sub_criterion_code` VARCHAR(10) NOT NULL,
    `sub_criterion_name` VARCHAR(160) NOT NULL,
    `score` INTEGER NOT NULL,
    `is_na` BOOLEAN NOT NULL DEFAULT false,
    `na_treatment` ENUM('NEVER_NA', 'EXCLUDE_RENORMALIZE', 'ASSIGN_NEUTRAL_2', 'ASSIGN_FIXED_1', 'ASSIGN_FIXED_2', 'ASSIGN_FIXED_4') NOT NULL,
    `weighted_included` BOOLEAN NOT NULL DEFAULT true,
    `auto_dq_if_zero` BOOLEAN NOT NULL DEFAULT false,
    `remarks` TEXT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    INDEX `credit_scorecard_items_scorecard_id_idx`(`scorecard_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `credit_committees` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `committee_name` VARCHAR(160) NOT NULL,
    `branch_id` INTEGER NULL,
    `is_head_office_committee` BOOLEAN NOT NULL DEFAULT false,
    `min_loan_amount` DECIMAL(14, 2) NOT NULL,
    `max_loan_amount` DECIMAL(14, 2) NULL,
    `status` ENUM('ACTIVE', 'INACTIVE') NOT NULL DEFAULT 'ACTIVE',
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    INDEX `credit_committees_branch_id_idx`(`branch_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `credit_committee_members` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `credit_committee_id` INTEGER NOT NULL,
    `user_id` INTEGER NOT NULL,
    `committee_role` VARCHAR(80) NOT NULL,
    `approval_sequence` INTEGER NOT NULL DEFAULT 1,
    `is_required` BOOLEAN NOT NULL DEFAULT true,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    INDEX `credit_committee_members_credit_committee_id_idx`(`credit_committee_id`),
    INDEX `credit_committee_members_user_id_idx`(`user_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `credit_committee_reviews` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `loan_application_id` INTEGER NOT NULL,
    `credit_committee_id` INTEGER NOT NULL,
    `reviewer_id` INTEGER NOT NULL,
    `decision` ENUM('PENDING', 'APPROVED', 'DENIED', 'RETURNED_FOR_COMPLETION') NOT NULL DEFAULT 'PENDING',
    `remarks` TEXT NULL,
    `reviewed_at` DATETIME(3) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    INDEX `credit_committee_reviews_loan_application_id_idx`(`loan_application_id`),
    INDEX `credit_committee_reviews_credit_committee_id_idx`(`credit_committee_id`),
    INDEX `credit_committee_reviews_reviewer_id_idx`(`reviewer_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `audit_logs` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `user_id` INTEGER NULL,
    `action` VARCHAR(120) NOT NULL,
    `entity_type` VARCHAR(120) NOT NULL,
    `entity_id` VARCHAR(80) NOT NULL,
    `old_value` JSON NULL,
    `new_value` JSON NULL,
    `ip_address` VARCHAR(80) NULL,
    `user_agent` VARCHAR(255) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `audit_logs_user_id_idx`(`user_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `branch_staff_assignments` ADD CONSTRAINT `branch_staff_assignments_branch_id_fkey` FOREIGN KEY (`branch_id`) REFERENCES `branches`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `branch_staff_assignments` ADD CONSTRAINT `branch_staff_assignments_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `users` ADD CONSTRAINT `users_branch_id_fkey` FOREIGN KEY (`branch_id`) REFERENCES `branches`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `loan_applications` ADD CONSTRAINT `loan_applications_branch_id_fkey` FOREIGN KEY (`branch_id`) REFERENCES `branches`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `loan_applications` ADD CONSTRAINT `loan_applications_loan_officer_id_fkey` FOREIGN KEY (`loan_officer_id`) REFERENCES `users`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `loan_applications` ADD CONSTRAINT `loan_applications_created_by_fkey` FOREIGN KEY (`created_by`) REFERENCES `users`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `applicant_profiles` ADD CONSTRAINT `applicant_profiles_loan_application_id_fkey` FOREIGN KEY (`loan_application_id`) REFERENCES `loan_applications`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `household_backgrounds` ADD CONSTRAINT `household_backgrounds_loan_application_id_fkey` FOREIGN KEY (`loan_application_id`) REFERENCES `loan_applications`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `income_profiles` ADD CONSTRAINT `income_profiles_loan_application_id_fkey` FOREIGN KEY (`loan_application_id`) REFERENCES `loan_applications`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `existing_liabilities` ADD CONSTRAINT `existing_liabilities_loan_application_id_fkey` FOREIGN KEY (`loan_application_id`) REFERENCES `loan_applications`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `character_references` ADD CONSTRAINT `character_references_loan_application_id_fkey` FOREIGN KEY (`loan_application_id`) REFERENCES `loan_applications`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `assets` ADD CONSTRAINT `assets_loan_application_id_fkey` FOREIGN KEY (`loan_application_id`) REFERENCES `loan_applications`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `collateral` ADD CONSTRAINT `collateral_loan_application_id_fkey` FOREIGN KEY (`loan_application_id`) REFERENCES `loan_applications`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `credit_scorecards` ADD CONSTRAINT `credit_scorecards_loan_application_id_fkey` FOREIGN KEY (`loan_application_id`) REFERENCES `loan_applications`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `credit_scorecards` ADD CONSTRAINT `credit_scorecards_scored_by_fkey` FOREIGN KEY (`scored_by`) REFERENCES `users`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `credit_scorecard_items` ADD CONSTRAINT `credit_scorecard_items_scorecard_id_fkey` FOREIGN KEY (`scorecard_id`) REFERENCES `credit_scorecards`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `credit_committees` ADD CONSTRAINT `credit_committees_branch_id_fkey` FOREIGN KEY (`branch_id`) REFERENCES `branches`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `credit_committee_members` ADD CONSTRAINT `credit_committee_members_credit_committee_id_fkey` FOREIGN KEY (`credit_committee_id`) REFERENCES `credit_committees`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `credit_committee_members` ADD CONSTRAINT `credit_committee_members_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `credit_committee_reviews` ADD CONSTRAINT `credit_committee_reviews_loan_application_id_fkey` FOREIGN KEY (`loan_application_id`) REFERENCES `loan_applications`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `credit_committee_reviews` ADD CONSTRAINT `credit_committee_reviews_credit_committee_id_fkey` FOREIGN KEY (`credit_committee_id`) REFERENCES `credit_committees`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `credit_committee_reviews` ADD CONSTRAINT `credit_committee_reviews_reviewer_id_fkey` FOREIGN KEY (`reviewer_id`) REFERENCES `users`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `audit_logs` ADD CONSTRAINT `audit_logs_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

