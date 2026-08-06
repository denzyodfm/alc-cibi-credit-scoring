ALTER TABLE `applicant_profiles`
  ADD COLUMN `photo_data_url` LONGTEXT NULL,
  ADD COLUMN `photo_mime_type` VARCHAR(40) NULL;
