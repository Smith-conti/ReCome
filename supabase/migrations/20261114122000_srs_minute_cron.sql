select cron.schedule('recome-expire-reservations','* * * * *','select public.expire_reservations();');
