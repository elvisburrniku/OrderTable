
-- Seed default system roles
INSERT INTO roles (tenant_id, name, display_name, permissions, is_system, created_at) VALUES
(NULL, 'owner', 'Owner', '["access_dashboard","access_bookings","access_customers","access_menu","access_tables","access_kitchen","access_users","access_billing","access_reports","access_notifications","access_integrations","access_settings","access_floor_plan","view_bookings","create_bookings","edit_bookings","delete_bookings","view_customers","edit_customers","view_settings","edit_settings","view_menu","edit_menu","view_tables","edit_tables","view_kitchen","manage_kitchen","view_users","manage_users","view_billing","manage_billing","view_reports","view_notifications","manage_notifications","view_integrations","manage_integrations"]', true, now()),
(NULL, 'manager', 'Manager', '["access_dashboard","access_bookings","access_customers","access_menu","access_tables","access_kitchen","access_reports","access_settings","view_bookings","create_bookings","edit_bookings","delete_bookings","view_customers","edit_customers","view_settings","edit_settings","view_menu","edit_menu","view_tables","edit_tables","view_kitchen","manage_kitchen","view_reports"]', true, now()),
(NULL, 'agent', 'Booking Agent', '["access_dashboard","access_bookings","access_customers","view_bookings","create_bookings","edit_bookings","view_customers","edit_customers"]', true, now()),
(NULL, 'kitchen_staff', 'Kitchen Staff', '["access_dashboard","access_kitchen","view_kitchen","manage_kitchen"]', true, now())
ON CONFLICT (name) DO NOTHING;
