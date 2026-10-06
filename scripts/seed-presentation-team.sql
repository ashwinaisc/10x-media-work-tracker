BEGIN TRANSACTION;

UPDATE people SET name='Ashwin', employee_id='MHS-202', job='Senior Editor', manager_id='81546e26-8870-47f5-9378-2e6c230ee5f1', active=1 WHERE lower(email)='ashwinais.mhs@gmail.com';
INSERT INTO people(id,email,name,employee_id,role,job,manager_id,active) VALUES
('member_mhs278','karthikeyan.pmhs@gmail.com','P. Karthikeyan','MHS278','creator','Junior Editor','81546e26-8870-47f5-9378-2e6c230ee5f1',1),
('member_mhs316','rahulravi.mhs@gmail.com','Rahul Ravichandran','MHS316','creator','Junior Editor','81546e26-8870-47f5-9378-2e6c230ee5f1',1),
('member_mhs382','ragulbabu.20mhs@gmail.com','Ragul B','MHS382','creator','Junior Editor','81546e26-8870-47f5-9378-2e6c230ee5f1',1),
('member_mhs386','sasilvikram.mhs@gmail.com','Sasil Vikram','MHS386','creator','Junior Editor','81546e26-8870-47f5-9378-2e6c230ee5f1',1),
('member_mhs171','varadharaj.s11mhs@gmail.com','Varadharaj','MHS171','creator','Senior Editor','81546e26-8870-47f5-9378-2e6c230ee5f1',1),
('member_mhs299','muthumhs22@gmail.com','Muthu Krishnan','MHS299','creator','Senior Editor','81546e26-8870-47f5-9378-2e6c230ee5f1',1),
('member_mhs090','kameshmhs@gmail.com','Kamesh Kumar','MHS090','creator','Senior Editor','81546e26-8870-47f5-9378-2e6c230ee5f1',1),
('member_mhs250','rahul25mhs@gmail.com','Rahul','MHS250','creator','Junior Editor','81546e26-8870-47f5-9378-2e6c230ee5f1',1),
('member_mhs392','haroonbasha.if@gmail.com','Haroon Basha','MHS392','creator','Senior Editor','81546e26-8870-47f5-9378-2e6c230ee5f1',1),
('member_mhs281','michael.91mhs@gmail.com','Michael','MHS281','creator','Junior Editor','81546e26-8870-47f5-9378-2e6c230ee5f1',1)
ON CONFLICT(email) DO UPDATE SET name=excluded.name,employee_id=excluded.employee_id,job=excluded.job,manager_id=excluded.manager_id,active=1;

INSERT INTO goal_types(id,manager_id,name,unit) VALUES
('type_reels','81546e26-8870-47f5-9378-2e6c230ee5f1','Reels','jobs'),
('type_ads','81546e26-8870-47f5-9378-2e6c230ee5f1','Ads','jobs'),
('type_longform','81546e26-8870-47f5-9378-2e6c230ee5f1','Longform','jobs'),
('type_carousel','81546e26-8870-47f5-9378-2e6c230ee5f1','Carousel','jobs'),
('type_schedule','81546e26-8870-47f5-9378-2e6c230ee5f1','Schedule','jobs'),
('type_video_carousel','81546e26-8870-47f5-9378-2e6c230ee5f1','Video Carousel','jobs'),
('type_ffc','81546e26-8870-47f5-9378-2e6c230ee5f1','FFC','jobs')
ON CONFLICT(manager_id,name) DO UPDATE SET unit=excluded.unit;

-- Every employee can record unplanned work under Others.
INSERT INTO plans(id,member_id,type_id,month,target,hours_per_job)
SELECT 'plan_others_' || employee_id,id,'others_81546e26-8870-47f5-9378-2e6c230ee5f1','2026-09',0,NULL FROM people WHERE role='creator' AND manager_id='81546e26-8870-47f5-9378-2e6c230ee5f1' AND lower(email)!='vasanthmhs@gmail.com'
ON CONFLICT(member_id,month,type_id) DO UPDATE SET target=0,hours_per_job=NULL;

-- Presentation targets and per-job hour estimates.
WITH goals(email,type_name,target,rate) AS (VALUES
('ashwinais.mhs@gmail.com','Shoot',8,4.0),('ashwinais.mhs@gmail.com','Post',100,0.5),('ashwinais.mhs@gmail.com','Story',120,0.5),('ashwinais.mhs@gmail.com','AI Hours',4,1.0),
('muthumhs22@gmail.com','Reels',26,4.0),('muthumhs22@gmail.com','Ads',10,4.0),('muthumhs22@gmail.com','Longform',6,4.0),
('rahulravi.mhs@gmail.com','Ads',10,0.5),('rahulravi.mhs@gmail.com','Carousel',35,3.0),('rahulravi.mhs@gmail.com','Schedule',24,2.0),
('sasilvikram.mhs@gmail.com','Reels',26,4.0),('sasilvikram.mhs@gmail.com','Ads',10,4.0),('sasilvikram.mhs@gmail.com','Longform',4,6.0),
('ragulbabu.20mhs@gmail.com','Video Carousel',60,2.0),('ragulbabu.20mhs@gmail.com','AI Hours',6,1.0),
('varadharaj.s11mhs@gmail.com','Ads',25,4.0),('varadharaj.s11mhs@gmail.com','Longform',6,4.0),('varadharaj.s11mhs@gmail.com','AI Hours',5,1.0),
('kameshmhs@gmail.com','Reels',26,4.0),('kameshmhs@gmail.com','Ads',10,4.0),('kameshmhs@gmail.com','Shoot',8,4.0),('kameshmhs@gmail.com','Longform',2,6.0),
('rahul25mhs@gmail.com','Reels',10,4.0),('rahul25mhs@gmail.com','Ads',10,4.0),('rahul25mhs@gmail.com','Carousel',15,3.0),('rahul25mhs@gmail.com','Shoot',8,4.0),('rahul25mhs@gmail.com','AI Hours',10,1.0),
('karthikeyan.pmhs@gmail.com','Carousel',20,3.0),('karthikeyan.pmhs@gmail.com','FFC',24,2.0),('karthikeyan.pmhs@gmail.com','AI Hours',5,1.0),
('haroonbasha.if@gmail.com','Carousel',35,3.0),('haroonbasha.if@gmail.com','Story',180,0.2),('haroonbasha.if@gmail.com','Schedule',24,2.0),
('michael.91mhs@gmail.com','Ads',25,4.0),('michael.91mhs@gmail.com','Shoot',7,4.0),('michael.91mhs@gmail.com','AI Hours',5,1.0)
)
INSERT INTO plans(id,member_id,type_id,month,target,hours_per_job)
SELECT 'plan_' || replace(lower(g.type_name),' ','_') || '_' || p.employee_id,p.id,t.id,'2026-09',g.target,g.rate
FROM goals g JOIN people p ON lower(p.email)=g.email JOIN goal_types t ON t.manager_id=p.manager_id AND lower(t.name)=lower(g.type_name)
ON CONFLICT(member_id,month,type_id) DO UPDATE SET target=excluded.target,hours_per_job=excluded.hours_per_job;

COMMIT;
