INSERT INTO `goal_types` (`id`, `manager_id`, `name`, `unit`)
SELECT 'others_' || `id`, `id`, 'Others', 'jobs'
FROM `people`
WHERE `role` = 'manager'
  AND NOT EXISTS (
    SELECT 1
    FROM `goal_types`
    WHERE `goal_types`.`manager_id` = `people`.`id`
      AND lower(`goal_types`.`name`) = 'others'
  );
