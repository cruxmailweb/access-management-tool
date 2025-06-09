-- Create database if it doesn't exist
CREATE DATABASE IF NOT EXISTS access_management;

USE access_management;

-- Users table
CREATE TABLE IF NOT EXISTS users (
  id INT AUTO_INCREMENT PRIMARY KEY,
  username VARCHAR(255) NOT NULL UNIQUE,
  email VARCHAR(255) NOT NULL UNIQUE,
  password VARCHAR(255) NOT NULL,
  role ENUM('admin', 'readonly') NOT NULL DEFAULT 'readonly',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Applications table
CREATE TABLE IF NOT EXISTS applications (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Junction table for application users
CREATE TABLE IF NOT EXISTS application_users (
  id INT AUTO_INCREMENT PRIMARY KEY,
  application_id INT NOT NULL,
  user_id INT NOT NULL,
  is_admin BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (application_id) REFERENCES applications(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  UNIQUE KEY unique_app_user (application_id, user_id)
);

-- Reminders table
CREATE TABLE IF NOT EXISTS reminders (
  id INT AUTO_INCREMENT PRIMARY KEY,
  application_id INT NOT NULL,
  reminder_frequency ENUM('weekly', 'monthly', 'quarterly') NOT NULL DEFAULT 'monthly',
  next_reminder_date DATETIME NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  last_sent DATETIME NULL,
  FOREIGN KEY (application_id) REFERENCES applications(id) ON DELETE CASCADE,
  UNIQUE KEY unique_app_reminder (application_id)
);

-- Reminder emails table
CREATE TABLE IF NOT EXISTS reminder_emails (
  id INT AUTO_INCREMENT PRIMARY KEY,
  reminder_id INT NOT NULL,
  email VARCHAR(255) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (reminder_id) REFERENCES reminders(id) ON DELETE CASCADE
);

-- Insert default admin user (password: admin123)
INSERT INTO users (username, email, password, role)
VALUES ('admin', 'admin@example.com', '$2a$12$ik.FZfY/Lx6NQhK5LJ3Y8.1iIBGdQoB9HCLBEyJUQUCDQOi9Vn5tq', 'admin')
ON DUPLICATE KEY UPDATE username = 'admin';

-- Insert default readonly user (password: viewer123)
INSERT INTO users (username, email, password, role)
VALUES ('viewer', 'viewer@example.com', '$2a$12$ik.FZfY/Lx6NQhK5LJ3Y8.1iIBGdQoB9HCLBEyJUQUCDQOi9Vn5tq', 'readonly')
ON DUPLICATE KEY UPDATE username = 'viewer';

-- Insert sample applications
INSERT INTO applications (name, description)
VALUES 
  ('Customer Portal', 'Main customer-facing application'),
  ('Admin Dashboard', 'Internal admin management system'),
  ('Analytics Platform', 'Data analytics and reporting')
ON DUPLICATE KEY UPDATE name = VALUES(name);

-- Get application IDs
SET @customer_portal_id = (SELECT id FROM applications WHERE name = 'Customer Portal' LIMIT 1);
SET @admin_dashboard_id = (SELECT id FROM applications WHERE name = 'Admin Dashboard' LIMIT 1);
SET @analytics_platform_id = (SELECT id FROM applications WHERE name = 'Analytics Platform' LIMIT 1);

-- Get user IDs
SET @admin_id = (SELECT id FROM users WHERE username = 'admin' LIMIT 1);
SET @viewer_id = (SELECT id FROM users WHERE username = 'viewer' LIMIT 1);

-- Insert application users
INSERT INTO application_users (application_id, user_id, is_admin)
VALUES 
  (@customer_portal_id, @admin_id, TRUE),
  (@customer_portal_id, @viewer_id, FALSE),
  (@admin_dashboard_id, @admin_id, TRUE),
  (@analytics_platform_id, @admin_id, TRUE),
  (@analytics_platform_id, @viewer_id, FALSE)
ON DUPLICATE KEY UPDATE application_id = VALUES(application_id);

-- Create sample reminder
INSERT INTO reminders (application_id, reminder_frequency, next_reminder_date)
VALUES 
  (@customer_portal_id, 'monthly', DATE_ADD(CURRENT_DATE(), INTERVAL 30 DAY))
ON DUPLICATE KEY UPDATE application_id = VALUES(application_id);

-- Get reminder ID
SET @reminder_id = (SELECT id FROM reminders WHERE application_id = @customer_portal_id LIMIT 1);

-- Insert reminder emails
INSERT INTO reminder_emails (reminder_id, email)
VALUES 
  (@reminder_id, 'admin@example.com'),
  (@reminder_id, 'security@example.com')
ON DUPLICATE KEY UPDATE reminder_id = VALUES(reminder_id);
