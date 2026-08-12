CREATE TABLE `branch_committee_assignments` (
  `id` INTEGER NOT NULL AUTO_INCREMENT,
  `branch_id` INTEGER NOT NULL,
  `role_key` VARCHAR(50) NOT NULL,
  `user_id` INTEGER NOT NULL,
  `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updated_at` DATETIME(3) NOT NULL,
  UNIQUE INDEX `branch_committee_assignments_branch_id_role_key_key`(`branch_id`, `role_key`),
  INDEX `branch_committee_assignments_user_id_idx`(`user_id`),
  PRIMARY KEY (`id`),
  CONSTRAINT `branch_committee_assignments_branch_id_fkey` FOREIGN KEY (`branch_id`) REFERENCES `branches`(`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `branch_committee_assignments_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

ALTER TABLE `credit_committee_reviews`
  ADD COLUMN `committee_role` VARCHAR(80) NULL,
  ADD COLUMN `approval_sequence` INTEGER NOT NULL DEFAULT 1;
