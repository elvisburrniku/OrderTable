ALTER TABLE "tables"
ALTER COLUMN booking_date_from TYPE date
USING booking_date_from::date;
