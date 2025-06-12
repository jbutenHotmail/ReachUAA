-- Reach UAA Colportage Management System Database Schema
-- MySQL version

-- Enable strict mode
SET sql_mode = 'STRICT_TRANS_TABLES,NO_ENGINE_SUBSTITUTION';

-- Create database
CREATE DATABASE reach_uaa;
USE reach_uaa;

-- =============================================
-- CORE TABLES
-- =============================================

-- Programs table
CREATE TABLE programs (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    motto VARCHAR(255),
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    financial_goal DECIMAL(10, 2) NOT NULL,
    logo_url VARCHAR(255),
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Program working days
CREATE TABLE program_working_days (
    id INT AUTO_INCREMENT PRIMARY KEY,
    program_id INT NOT NULL,
    day_of_week ENUM('monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday') NOT NULL,
    is_working_day BOOLEAN NOT NULL DEFAULT TRUE,
    FOREIGN KEY (program_id) REFERENCES programs(id) ON DELETE CASCADE,
    UNIQUE KEY unique_program_day (program_id, day_of_week)
);

-- Custom program days (overrides for specific dates)
CREATE TABLE program_custom_days (
    id INT AUTO_INCREMENT PRIMARY KEY,
    program_id INT NOT NULL,
    date DATE NOT NULL,
    is_working_day BOOLEAN NOT NULL,
    FOREIGN KEY (program_id) REFERENCES programs(id) ON DELETE CASCADE,
    UNIQUE KEY unique_program_date (program_id, date)
);

-- Program financial configuration
CREATE TABLE program_financial_config (
    id INT AUTO_INCREMENT PRIMARY KEY,
    program_id INT NOT NULL,
    colporter_percentage DECIMAL(5, 2) NOT NULL DEFAULT 50.00,
    leader_percentage DECIMAL(5, 2) NOT NULL DEFAULT 15.00,
    colporter_cash_advance_percentage DECIMAL(5, 2) NOT NULL DEFAULT 20.00,
    leader_cash_advance_percentage DECIMAL(5, 2) NOT NULL DEFAULT 25.00,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (program_id) REFERENCES programs(id) ON DELETE CASCADE,
    UNIQUE KEY unique_program_config (program_id)
);

-- =============================================
-- USER MANAGEMENT TABLES
-- =============================================

-- People table (base table for colporters and leaders)
CREATE TABLE people (
    id INT AUTO_INCREMENT PRIMARY KEY,
    first_name VARCHAR(50) NOT NULL,
    last_name VARCHAR(50) NOT NULL,
    email VARCHAR(100) NOT NULL UNIQUE,
    phone VARCHAR(20),
    address TEXT,
    profile_image_url VARCHAR(255),
    person_type ENUM('COLPORTER', 'LEADER') NOT NULL,
    status ENUM('ACTIVE', 'INACTIVE') NOT NULL DEFAULT 'ACTIVE',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Colporters table (extends people)
CREATE TABLE colporters (
    id INT PRIMARY KEY,
    school VARCHAR(100) NOT NULL,
    age INT,
    FOREIGN KEY (id) REFERENCES people(id) ON DELETE CASCADE
);

-- Leaders table (extends people)
CREATE TABLE leaders (
    id INT PRIMARY KEY,
    institution VARCHAR(100) NOT NULL,
    FOREIGN KEY (id) REFERENCES people(id) ON DELETE CASCADE
);

-- Users table
CREATE TABLE users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    person_id INT,
    email VARCHAR(100) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    role ENUM('ADMIN', 'SUPERVISOR', 'VIEWER') NOT NULL,
    status ENUM('ACTIVE', 'INACTIVE') NOT NULL DEFAULT 'ACTIVE',
    last_login TIMESTAMP NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (person_id) REFERENCES people(id) ON DELETE SET NULL
);

-- Permissions table
CREATE TABLE permissions (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(50) NOT NULL UNIQUE,
    description VARCHAR(255)
);

-- Role permissions
CREATE TABLE role_permissions (
    role ENUM('ADMIN', 'SUPERVISOR', 'VIEWER') NOT NULL,
    permission_id INT NOT NULL,
    PRIMARY KEY (role, permission_id),
    FOREIGN KEY (permission_id) REFERENCES permissions(id) ON DELETE CASCADE
);

-- =============================================
-- INVENTORY MANAGEMENT TABLES
-- =============================================

-- Books table
CREATE TABLE books (
    id INT AUTO_INCREMENT PRIMARY KEY,
    isbn VARCHAR(20) UNIQUE,  -- ISBN is now optional
    title VARCHAR(100) NOT NULL,
    author VARCHAR(100),
    publisher VARCHAR(100),
    price DECIMAL(10, 2) NOT NULL,
    category VARCHAR(50) NOT NULL,
    description TEXT,
    image_url VARCHAR(255),
    stock INT NOT NULL DEFAULT 0,
    sold INT NOT NULL DEFAULT 0,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Program Books table (for program-specific book details)
CREATE TABLE program_books (
    id INT AUTO_INCREMENT PRIMARY KEY,
    program_id INT NOT NULL,
    book_id INT NOT NULL,
    price DECIMAL(10, 2) NOT NULL,  -- Program-specific price
    initial_stock INT NOT NULL DEFAULT 0,  -- Initial stock for this program
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (program_id) REFERENCES programs(id) ON DELETE CASCADE,
    FOREIGN KEY (book_id) REFERENCES books(id) ON DELETE CASCADE,
    UNIQUE KEY unique_program_book (program_id, book_id)
);

-- Inventory movements
CREATE TABLE inventory_movements (
    id INT AUTO_INCREMENT PRIMARY KEY,
    book_id INT NOT NULL,
    user_id INT NOT NULL,
    quantity INT NOT NULL,
    movement_type ENUM('IN', 'OUT', 'SALE', 'RETURN') NOT NULL,
    notes TEXT,
    movement_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (book_id) REFERENCES books(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Inventory counts
CREATE TABLE inventory_counts (
    id INT AUTO_INCREMENT PRIMARY KEY,
    book_id INT NOT NULL,
    user_id INT NOT NULL,
    system_count INT NOT NULL,
    manual_count INT,
    discrepancy INT,
    count_date DATE NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (book_id) REFERENCES books(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    UNIQUE KEY unique_book_date (book_id, count_date)
);

-- =============================================
-- TRANSACTION TABLES
-- =============================================

-- Transactions table
CREATE TABLE transactions (
    id INT AUTO_INCREMENT PRIMARY KEY,
    student_id INT NOT NULL,
    leader_id INT NOT NULL,
    cash DECIMAL(10, 2) NOT NULL DEFAULT 0,
    checks DECIMAL(10, 2) NOT NULL DEFAULT 0,
    atm_mobile DECIMAL(10, 2) NOT NULL DEFAULT 0,
    paypal DECIMAL(10, 2) NOT NULL DEFAULT 0,
    total DECIMAL(10, 2) NOT NULL,
    transaction_date DATE NOT NULL,
    status ENUM('PENDING', 'APPROVED', 'REJECTED') NOT NULL DEFAULT 'PENDING',
    created_by INT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (student_id) REFERENCES people(id) ON DELETE CASCADE,
    FOREIGN KEY (leader_id) REFERENCES people(id) ON DELETE CASCADE,
    FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE CASCADE,
    UNIQUE KEY unique_student_date (student_id, transaction_date)
);

-- Transaction books
CREATE TABLE transaction_books (
    id INT AUTO_INCREMENT PRIMARY KEY,
    transaction_id INT NOT NULL,
    book_id INT NOT NULL,
    quantity INT NOT NULL,
    price DECIMAL(10, 2) NOT NULL,
    FOREIGN KEY (transaction_id) REFERENCES transactions(id) ON DELETE CASCADE,
    FOREIGN KEY (book_id) REFERENCES books(id) ON DELETE CASCADE
);

-- =============================================
-- FINANCIAL MANAGEMENT TABLES
-- =============================================

-- Cash advances
CREATE TABLE cash_advances (
    id INT AUTO_INCREMENT PRIMARY KEY,
    person_id INT NOT NULL,
    week_start_date DATE NOT NULL,
    week_end_date DATE NOT NULL,
    total_sales DECIMAL(10, 2) NOT NULL,
    transaction_count INT NOT NULL,
    advance_amount DECIMAL(10, 2) NOT NULL,
    status ENUM('PENDING', 'APPROVED', 'REJECTED') NOT NULL DEFAULT 'PENDING',
    request_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    approved_date TIMESTAMP NULL,
    approved_by INT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (person_id) REFERENCES people(id) ON DELETE CASCADE,
    FOREIGN KEY (approved_by) REFERENCES users(id) ON DELETE SET NULL
);

-- Charges and fines
CREATE TABLE charges (
    id INT AUTO_INCREMENT PRIMARY KEY,
    person_id INT NOT NULL,
    amount DECIMAL(10, 2) NOT NULL,
    reason VARCHAR(100) NOT NULL,
    description TEXT,
    category ENUM('FINE', 'DEDUCTION', 'PENALTY', 'OTHER') NOT NULL,
    status ENUM('PENDING', 'APPLIED', 'CANCELLED') NOT NULL DEFAULT 'PENDING',
    applied_by INT NOT NULL,
    charge_date DATE NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (person_id) REFERENCES people(id) ON DELETE CASCADE,
    FOREIGN KEY (applied_by) REFERENCES users(id) ON DELETE CASCADE
);

-- Expenses
CREATE TABLE expenses (
    id INT AUTO_INCREMENT PRIMARY KEY,
    leader_id INT NULL, -- NULL means program expense
    amount DECIMAL(10, 2) NOT NULL,
    motivo VARCHAR(100) NOT NULL,
    category ENUM('food', 'health', 'supplies', 'maintenance', 'fuel', 'vehicle', 'other') NOT NULL,
    notes TEXT,
    expense_date DATE NOT NULL,
    created_by INT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (leader_id) REFERENCES people(id) ON DELETE SET NULL,
    FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE CASCADE
);

-- Financial goals
CREATE TABLE financial_goals (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    amount DECIMAL(10, 2) NOT NULL,
    achieved DECIMAL(10, 2) NOT NULL DEFAULT 0,
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    goal_type ENUM('DAILY', 'WEEKLY', 'MONTHLY') NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- =============================================
-- VIEWS
-- =============================================

-- View for person details with name concatenation
CREATE VIEW view_people AS
SELECT 
    p.id,
    p.first_name,
    p.last_name,
    CONCAT(p.first_name, ' ', p.last_name) AS full_name,
    p.email,
    p.phone,
    p.address,
    p.profile_image_url,
    p.person_type,
    p.status,
    p.created_at,
    p.updated_at,
    CASE 
        WHEN p.person_type = 'COLPORTER' THEN c.school
        WHEN p.person_type = 'LEADER' THEN l.institution
        ELSE NULL
    END AS organization,
    CASE 
        WHEN p.person_type = 'COLPORTER' THEN c.age
        ELSE NULL
    END AS age,
    (SELECT COUNT(*) > 0 FROM users u WHERE u.person_id = p.id) AS has_user
FROM 
    people p
LEFT JOIN 
    colporters c ON p.id = c.id AND p.person_type = 'COLPORTER'
LEFT JOIN 
    leaders l ON p.id = l.id AND p.person_type = 'LEADER';

-- View for transaction details with person names
CREATE VIEW view_transactions AS
SELECT 
    t.id,
    t.student_id,
    CONCAT(sp.first_name, ' ', sp.last_name) AS student_name,
    t.leader_id,
    CONCAT(lp.first_name, ' ', lp.last_name) AS leader_name,
    t.cash,
    t.checks,
    t.atm_mobile,
    t.paypal,
    t.total,
    t.transaction_date,
    t.status,
    t.created_by,
    CONCAT(up.first_name, ' ', up.last_name) AS created_by_name,
    t.created_at,
    t.updated_at
FROM 
    transactions t
JOIN 
    people sp ON t.student_id = sp.id
JOIN 
    people lp ON t.leader_id = lp.id
JOIN 
    users u ON t.created_by = u.id
JOIN 
    people up ON u.person_id = up.id;

-- View for cash advances with person names
CREATE VIEW view_cash_advances AS
SELECT 
    ca.id,
    ca.person_id,
    CONCAT(p.first_name, ' ', p.last_name) AS person_name,
    p.person_type,
    ca.week_start_date,
    ca.week_end_date,
    ca.total_sales,
    ca.transaction_count,
    ca.advance_amount,
    ca.status,
    ca.request_date,
    ca.approved_date,
    ca.approved_by,
    CASE 
        WHEN ca.approved_by IS NOT NULL THEN 
            (SELECT CONCAT(ap.first_name, ' ', ap.last_name) 
             FROM users au 
             JOIN people ap ON au.person_id = ap.id 
             WHERE au.id = ca.approved_by)
        ELSE NULL
    END AS approved_by_name,
    ca.created_at,
    ca.updated_at
FROM 
    cash_advances ca
JOIN 
    people p ON ca.person_id = p.id;

-- View for charges with person names
CREATE VIEW view_charges AS
SELECT 
    c.id,
    c.person_id,
    CONCAT(p.first_name, ' ', p.last_name) AS person_name,
    p.person_type,
    c.amount,
    c.reason,
    c.description,
    c.category,
    c.status,
    c.applied_by,
    CONCAT(ap.first_name, ' ', ap.last_name) AS applied_by_name,
    c.charge_date,
    c.created_at,
    c.updated_at
FROM 
    charges c
JOIN 
    people p ON c.person_id = p.id
JOIN 
    users u ON c.applied_by = u.id
JOIN 
    people ap ON u.person_id = ap.id;

-- View for expenses with leader names
CREATE VIEW view_expenses AS
SELECT 
    e.id,
    e.leader_id,
    CASE 
        WHEN e.leader_id IS NOT NULL THEN CONCAT(p.first_name, ' ', p.last_name)
        ELSE 'Program'
    END AS leader_name,
    e.amount,
    e.motivo,
    e.category,
    e.notes,
    e.expense_date,
    e.created_by,
    CONCAT(cp.first_name, ' ', cp.last_name) AS created_by_name,
    e.created_at,
    e.updated_at
FROM 
    expenses e
LEFT JOIN 
    people p ON e.leader_id = p.id
JOIN 
    users u ON e.created_by = u.id
JOIN 
    people cp ON u.person_id = cp.id;

-- View for program books with book details
CREATE VIEW view_program_books AS
SELECT 
    pb.id,
    pb.program_id,
    p.name AS program_name,
    pb.book_id,
    b.title AS book_title,
    b.author AS book_author,
    b.category AS book_category,
    b.image_url AS book_image_url,
    pb.price AS program_price,
    b.price AS original_price,
    pb.initial_stock,
    b.is_active,
    pb.created_at,
    pb.updated_at
FROM 
    program_books pb
JOIN 
    programs p ON pb.program_id = p.id
JOIN 
    books b ON pb.book_id = b.id;

-- =============================================
-- STORED PROCEDURES
-- =============================================

-- Procedure to get weekly sales for a person
DELIMITER //
CREATE PROCEDURE get_weekly_sales(
    IN p_person_id INT,
    IN p_week_start_date DATE,
    IN p_week_end_date DATE
)
BEGIN
    DECLARE v_person_type VARCHAR(20);
    
    -- Get person type
    SELECT person_type INTO v_person_type FROM people WHERE id = p_person_id;
    
    IF v_person_type = 'COLPORTER' THEN
        -- For colporters, get their own transactions
        SELECT 
            p_person_id AS colporter_id,
            CONCAT(p.first_name, ' ', p.last_name) AS colporter_name,
            p_week_start_date AS week_start_date,
            p_week_end_date AS week_end_date,
            COALESCE(SUM(t.total), 0) AS total_sales,
            COUNT(t.id) AS transaction_count
        FROM 
            people p
        LEFT JOIN 
            transactions t ON p.id = t.student_id 
                AND t.transaction_date BETWEEN p_week_start_date AND p_week_end_date
                AND t.status = 'APPROVED'
        WHERE 
            p.id = p_person_id
        GROUP BY 
            p.id;
            
        -- Get daily sales for the colporter
        SELECT 
            t.transaction_date AS date,
            COALESCE(SUM(t.total), 0) AS amount
        FROM 
            transactions t
        WHERE 
            t.student_id = p_person_id
            AND t.transaction_date BETWEEN p_week_start_date AND p_week_end_date
            AND t.status = 'APPROVED'
        GROUP BY 
            t.transaction_date
        ORDER BY 
            t.transaction_date;
    ELSE
        -- For leaders, get transactions from their team
        SELECT 
            p_person_id AS leader_id,
            CONCAT(p.first_name, ' ', p.last_name) AS leader_name,
            p_week_start_date AS week_start_date,
            p_week_end_date AS week_end_date,
            COALESCE(SUM(t.total), 0) AS total_sales,
            COUNT(t.id) AS transaction_count
        FROM 
            people p
        LEFT JOIN 
            transactions t ON p.id = t.leader_id 
                AND t.transaction_date BETWEEN p_week_start_date AND p_week_end_date
                AND t.status = 'APPROVED'
        WHERE 
            p.id = p_person_id
        GROUP BY 
            p.id;
            
        -- Get daily sales for the leader's team
        SELECT 
            t.transaction_date AS date,
            COALESCE(SUM(t.total), 0) AS amount
        FROM 
            transactions t
        WHERE 
            t.leader_id = p_person_id
            AND t.transaction_date BETWEEN p_week_start_date AND p_week_end_date
            AND t.status = 'APPROVED'
        GROUP BY 
            t.transaction_date
        ORDER BY 
            t.transaction_date;
    END IF;
END //
DELIMITER ;

-- Procedure to calculate earnings for a person
DELIMITER //
CREATE PROCEDURE calculate_earnings(
    IN p_person_id INT,
    IN p_start_date DATE,
    IN p_end_date DATE
)
BEGIN
    DECLARE v_person_type VARCHAR(20);
    DECLARE v_colporter_percentage DECIMAL(5, 2);
    DECLARE v_leader_percentage DECIMAL(5, 2);
    DECLARE v_program_id INT;
    
    -- Get active program
    SELECT id INTO v_program_id FROM programs WHERE is_active = TRUE LIMIT 1;
    
    -- Get percentages from program config
    SELECT 
        colporter_percentage, 
        leader_percentage 
    INTO 
        v_colporter_percentage, 
        v_leader_percentage
    FROM 
        program_financial_config 
    WHERE 
        program_id = v_program_id;
    
    -- Get person type
    SELECT person_type INTO v_person_type FROM people WHERE id = p_person_id;
    
    IF v_person_type = 'COLPORTER' THEN
        -- For colporters, calculate earnings based on their transactions
        SELECT 
            p_person_id AS person_id,
            CONCAT(p.first_name, ' ', p.last_name) AS person_name,
            p.person_type,
            p_start_date AS start_date,
            p_end_date AS end_date,
            COALESCE(SUM(t.total), 0) AS total_sales,
            COALESCE(SUM(t.total) * (v_colporter_percentage / 100), 0) AS earnings,
            (SELECT COALESCE(SUM(amount), 0) FROM charges 
             WHERE person_id = p_person_id 
             AND charge_date BETWEEN p_start_date AND p_end_date
             AND status = 'APPLIED') AS total_charges,
            (SELECT COALESCE(SUM(advance_amount), 0) FROM cash_advances 
             WHERE person_id = p_person_id 
             AND week_start_date BETWEEN p_start_date AND p_end_date
             AND status = 'APPROVED') AS total_advances
        FROM 
            people p
        LEFT JOIN 
            transactions t ON p.id = t.student_id 
                AND t.transaction_date BETWEEN p_start_date AND p_end_date
                AND t.status = 'APPROVED'
        WHERE 
            p.id = p_person_id
        GROUP BY 
            p.id;
            
        -- Get daily earnings for the colporter
        SELECT 
            t.transaction_date AS date,
            COALESCE(SUM(t.total) * (v_colporter_percentage / 100), 0) AS amount
        FROM 
            transactions t
        WHERE 
            t.student_id = p_person_id
            AND t.transaction_date BETWEEN p_start_date AND p_end_date
            AND t.status = 'APPROVED'
        GROUP BY 
            t.transaction_date
        ORDER BY 
            t.transaction_date;
    ELSE
        -- For leaders, calculate earnings based on their team's transactions
        SELECT 
            p_person_id AS person_id,
            CONCAT(p.first_name, ' ', p.last_name) AS person_name,
            p.person_type,
            p_start_date AS start_date,
            p_end_date AS end_date,
            COALESCE(SUM(t.total), 0) AS total_sales,
            COALESCE(SUM(t.total) * (v_leader_percentage / 100), 0) AS earnings,
            (SELECT COALESCE(SUM(amount), 0) FROM charges 
             WHERE person_id = p_person_id 
             AND charge_date BETWEEN p_start_date AND p_end_date
             AND status = 'APPLIED') AS total_charges,
            (SELECT COALESCE(SUM(advance_amount), 0) FROM cash_advances 
             WHERE person_id = p_person_id 
             AND week_start_date BETWEEN p_start_date AND p_end_date
             AND status = 'APPROVED') AS total_advances
        FROM 
            people p
        LEFT JOIN 
            transactions t ON p.id = t.leader_id 
                AND t.transaction_date BETWEEN p_start_date AND p_end_date
                AND t.status = 'APPROVED'
        WHERE 
            p.id = p_person_id
        GROUP BY 
            p.id;
            
        -- Get daily earnings for the leader
        SELECT 
            t.transaction_date AS date,
            COALESCE(SUM(t.total) * (v_leader_percentage / 100), 0) AS amount
        FROM 
            transactions t
        WHERE 
            t.leader_id = p_person_id
            AND t.transaction_date BETWEEN p_start_date AND p_end_date
            AND t.status = 'APPROVED'
        GROUP BY 
            t.transaction_date
        ORDER BY 
            t.transaction_date;
    END IF;
END //
DELIMITER ;

-- Procedure to generate program financial report
DELIMITER //
CREATE PROCEDURE generate_program_report(
    IN p_program_id INT,
    IN p_start_date DATE,
    IN p_end_date DATE
)
BEGIN
    DECLARE v_colporter_percentage DECIMAL(5, 2);
    DECLARE v_leader_percentage DECIMAL(5, 2);
    
    -- Get percentages from program config
    SELECT 
        colporter_percentage, 
        leader_percentage 
    INTO 
        v_colporter_percentage, 
        v_leader_percentage
    FROM 
        program_financial_config 
    WHERE 
        program_id = p_program_id;
        
    -- Get program income
    SELECT 
        COALESCE(SUM(t.total), 0) AS total_donations,
        COALESCE(SUM(c.amount), 0) AS total_fines,
        COALESCE(SUM(t.total), 0) + COALESCE(SUM(c.amount), 0) AS total_income
    FROM 
        transactions t
    LEFT JOIN 
        charges c ON c.status = 'APPLIED' AND c.charge_date BETWEEN p_start_date AND p_end_date
    WHERE 
        t.transaction_date BETWEEN p_start_date AND p_end_date
        AND t.status = 'APPROVED';
        
    -- Get program expenses
    SELECT 
        COALESCE(SUM(ca.advance_amount), 0) AS total_advances,
        COALESCE(SUM(e.amount), 0) AS program_expenses,
        COALESCE(SUM(ca.advance_amount), 0) + COALESCE(SUM(e.amount), 0) AS total_expenses
    FROM 
        cash_advances ca
    LEFT JOIN 
        expenses e ON e.leader_id IS NULL AND e.expense_date BETWEEN p_start_date AND p_end_date
    WHERE 
        ca.week_start_date BETWEEN p_start_date AND p_end_date
        AND ca.status = 'APPROVED';
        
    -- Get distribution amounts
    SELECT 
        COALESCE(SUM(t.total), 0) * (v_colporter_percentage / 100) AS colporter_amount,
        COALESCE(SUM(t.total), 0) * (v_leader_percentage / 100) AS leader_amount
    FROM 
        transactions t
    WHERE 
        t.transaction_date BETWEEN p_start_date AND p_end_date
        AND t.status = 'APPROVED';
        
    -- Get colporter performance
    SELECT 
        p.id AS colporter_id,
        CONCAT(p.first_name, ' ', p.last_name) AS colporter_name,
        lp.id AS leader_id,
        CONCAT(lp.first_name, ' ', lp.last_name) AS leader_name,
        COALESCE(SUM(t.total), 0) AS donations,
        (SELECT COALESCE(SUM(amount), 0) FROM charges 
         WHERE person_id = p.id 
         AND charge_date BETWEEN p_start_date AND p_end_date
         AND status = 'APPLIED') AS fines,
        (SELECT COALESCE(SUM(advance_amount), 0) FROM cash_advances 
         WHERE person_id = p.id 
         AND week_start_date BETWEEN p_start_date AND p_end_date
         AND status = 'APPROVED') AS advances,
        COALESCE(SUM(t.total), 0) * (v_colporter_percentage / 100) AS earnings
    FROM 
        people p
    JOIN 
        transactions t ON p.id = t.student_id
    JOIN 
        people lp ON t.leader_id = lp.id
    WHERE 
        p.person_type = 'COLPORTER'
        AND t.transaction_date BETWEEN p_start_date AND p_end_date
        AND t.status = 'APPROVED'
    GROUP BY 
        p.id, lp.id;
        
    -- Get leader performance
    SELECT 
        p.id AS leader_id,
        CONCAT(p.first_name, ' ', p.last_name) AS leader_name,
        COUNT(DISTINCT t.student_id) AS colporter_count,
        COALESCE(SUM(t.total), 0) AS total_donations,
        COALESCE(SUM(t.total), 0) * (v_leader_percentage / 100) AS leader_earnings
    FROM 
        people p
    JOIN 
        transactions t ON p.id = t.leader_id
    WHERE 
        p.person_type = 'LEADER'
        AND t.transaction_date BETWEEN p_start_date AND p_end_date
        AND t.status = 'APPROVED'
    GROUP BY 
        p.id;
END //
DELIMITER ;

-- =============================================
-- TRIGGERS
-- =============================================

-- Trigger to update transaction total when payment methods change
DELIMITER //
CREATE TRIGGER before_transaction_insert_update
BEFORE INSERT ON transactions
FOR EACH ROW
BEGIN
    SET NEW.total = NEW.cash + NEW.checks + NEW.atm_mobile + NEW.paypal;
END //
DELIMITER ;

-- Trigger to update transaction total when payment methods change
DELIMITER //
CREATE TRIGGER before_transaction_update
BEFORE UPDATE ON transactions
FOR EACH ROW
BEGIN
    SET NEW.total = NEW.cash + NEW.checks + NEW.atm_mobile + NEW.paypal;
END //
DELIMITER ;

-- Trigger to update book stock when transaction is approved
DELIMITER //
CREATE TRIGGER after_transaction_status_update
AFTER UPDATE ON transactions
FOR EACH ROW
BEGIN
    IF NEW.status = 'APPROVED' AND OLD.status != 'APPROVED' THEN
        -- Update book stock and sold counts
        UPDATE books b
        JOIN transaction_books tb ON b.id = tb.book_id
        SET b.sold = b.sold + tb.quantity
        WHERE tb.transaction_id = NEW.id;
    END IF;
    
    IF NEW.status = 'REJECTED' AND OLD.status = 'APPROVED' THEN
        -- Revert book stock and sold counts
        UPDATE books b
        JOIN transaction_books tb ON b.id = tb.book_id
        SET b.sold = b.sold - tb.quantity
        WHERE tb.transaction_id = NEW.id;
    END IF;
END //
DELIMITER ;

-- =============================================
-- INDEXES
-- =============================================

-- Add indexes for performance
CREATE INDEX idx_transactions_date ON transactions(transaction_date);
CREATE INDEX idx_transactions_student ON transactions(student_id);
CREATE INDEX idx_transactions_leader ON transactions(leader_id);
CREATE INDEX idx_transactions_status ON transactions(status);

CREATE INDEX idx_cash_advances_person ON cash_advances(person_id);
CREATE INDEX idx_cash_advances_dates ON cash_advances(week_start_date, week_end_date);
CREATE INDEX idx_cash_advances_status ON cash_advances(status);

CREATE INDEX idx_charges_person ON charges(person_id);
CREATE INDEX idx_charges_date ON charges(charge_date);
CREATE INDEX idx_charges_status ON charges(status);

CREATE INDEX idx_expenses_leader ON expenses(leader_id);
CREATE INDEX idx_expenses_date ON expenses(expense_date);
CREATE INDEX idx_expenses_category ON expenses(category);

CREATE INDEX idx_people_type ON people(person_type);
CREATE INDEX idx_people_status ON people(status);
CREATE INDEX idx_people_name ON people(first_name, last_name);

CREATE INDEX idx_books_category ON books(category);
CREATE INDEX idx_books_active ON books(is_active);

CREATE INDEX idx_program_books_program ON program_books(program_id);
CREATE INDEX idx_program_books_book ON program_books(book_id);

-- =============================================
-- INITIAL DATA
-- =============================================

-- Insert permissions
INSERT INTO permissions (name, description) VALUES
('dashboard_view', 'Access to view the main dashboard'),
('transactions_view', 'Access to view transactions'),
('transactions_create', 'Ability to create new transactions'),
('transactions_approve', 'Ability to approve or reject transactions'),
('inventory_view', 'Access to view book inventory'),
('inventory_manage', 'Ability to add, edit, and manage books'),
('inventory_toggle', 'Ability to activate/deactivate books'),
('expenses_view', 'Access to view expenses'),
('expenses_manage', 'Ability to add and edit expenses'),
('cash_advance_view', 'Access to view cash advances'),
('cash_advance_manage', 'Ability to create and approve cash advances'),
('charges_view', 'Access to view charges and fines'),
('charges_manage', 'Ability to create and manage charges and fines'),
('reports_view', 'Access to view reports'),
('people_view', 'Access to view colporters and leaders'),
('people_manage', 'Ability to add and edit colporters and leaders'),
('users_view', 'Access to view system users'),
('users_manage', 'Ability to add, edit, and manage system users'),
('roles_manage', 'Ability to configure role permissions'),
('program_settings', 'Access to configure program settings');

-- Insert role permissions for ADMIN
INSERT INTO role_permissions (role, permission_id)
SELECT 'ADMIN', id FROM permissions;

-- Insert role permissions for SUPERVISOR
INSERT INTO role_permissions (role, permission_id)
SELECT 'SUPERVISOR', id FROM permissions
WHERE name IN (
    'dashboard_view', 'transactions_view', 'transactions_create', 'transactions_approve',
    'inventory_view', 'inventory_manage', 'expenses_view', 'expenses_manage',
    'cash_advance_view', 'cash_advance_manage', 'charges_view', 'charges_manage',
    'reports_view', 'people_view'
);

-- Insert role permissions for VIEWER
INSERT INTO role_permissions (role, permission_id)
SELECT 'VIEWER', id FROM permissions
WHERE name IN (
    'dashboard_view', 'transactions_view', 'transactions_create', 'inventory_view'
);