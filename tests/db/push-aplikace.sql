-- Scénář: tokeny zařízení z aplikací z obchodů (migrace 0045).
\set ON_ERROR_STOP 0
insert into auth.users (id, email, raw_user_meta_data) values
 ('00000000-0000-0000-0000-00000000d001','push@x.cz','{"full_name":"Push"}');
-- web, iPhone a Android vedle sebe
insert into push_subscriptions (user_id, endpoint, p256dh, auth) values
 ('00000000-0000-0000-0000-00000000d001','https://fcm.googleapis.com/wp/abc','k','a');
insert into push_subscriptions (user_id, endpoint, druh, p256dh, auth) values
 ('00000000-0000-0000-0000-00000000d001','apns:' || repeat('a',64),'apns','',''),
 ('00000000-0000-0000-0000-00000000d001','fcm:token123','fcm','','');
select count(*) = 3 as p1_tri_kanaly from push_subscriptions where user_id = '00000000-0000-0000-0000-00000000d001';
select druh = 'web' as p2_vychozi_web from push_subscriptions where endpoint like 'https://%' and user_id = '00000000-0000-0000-0000-00000000d001';
-- nesoulad druhu a předpony odmítne (ERROR čekaný ×2)
insert into push_subscriptions (user_id, endpoint, druh, p256dh, auth) values
 ('00000000-0000-0000-0000-00000000d001','fcm:spatne','apns','','');
insert into push_subscriptions (user_id, endpoint, druh, p256dh, auth) values
 ('00000000-0000-0000-0000-00000000d001','https://x','fcm','','');
select count(*) = 3 as p3_nic_navic from push_subscriptions where user_id = '00000000-0000-0000-0000-00000000d001';
