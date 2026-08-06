/*
  Warnings:

  - You are about to drop the column `father_dob_dod_age` on the `household_backgrounds` table. All the data in the column will be lost.
  - You are about to drop the column `mother_dob_dod_age` on the `household_backgrounds` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE `household_backgrounds` DROP COLUMN `father_dob_dod_age`,
    DROP COLUMN `mother_dob_dod_age`,
    ADD COLUMN `father_age` INTEGER NULL,
    ADD COLUMN `father_dob` DATE NULL,
    ADD COLUMN `father_dod` DATE NULL,
    ADD COLUMN `mother_age` INTEGER NULL,
    ADD COLUMN `mother_dob` DATE NULL,
    ADD COLUMN `mother_dod` DATE NULL;
