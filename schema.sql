-- Schema for Hospital Equipment, Locations, and Claims
-- Note: This system operates entirely offline/locally. No data is sent to the outside world.

CREATE TABLE Buildings (
    building_id SERIAL PRIMARY KEY,
    building_name VARCHAR(100) NOT NULL
);

CREATE TABLE Departments (
    department_id SERIAL PRIMARY KEY,
    building_id INT REFERENCES Buildings(building_id),
    floor VARCHAR(10),
    department_name VARCHAR(150),
    is_technical_area BOOLEAN DEFAULT FALSE -- Used to identify Technical Support / Sysadmin areas
);

CREATE TABLE Assets (
    asset_id SERIAL PRIMARY KEY,
    asset_barcode VARCHAR(50) UNIQUE,
    category VARCHAR(50), -- e.g., 'Monitor', 'Webcam', 'Computer'
    brand VARCHAR(50),
    model VARCHAR(100),
    department_id INT REFERENCES Departments(department_id),
    purchase_date DATE,
    purchase_price DECIMAL(10, 2),
    warranty_months INT,
    expected_lifespan_months INT
);

CREATE TABLE Claims (
    claim_id SERIAL PRIMARY KEY,
    asset_id INT REFERENCES Assets(asset_id),
    claim_date DATE DEFAULT CURRENT_DATE,
    issue_description TEXT,
    status VARCHAR(50)
);

-- ==========================================
-- INSERTING SAMPLE DATA BASED ON THE LAYOUT
-- ==========================================

-- Insert Buildings
INSERT INTO Buildings (building_name) VALUES 
('Building 1'), 
('AP Ward'), 
('Call Center Old'), 
('Call Center New');

-- Insert Departments (Sample mapping)
INSERT INTO Departments (building_id, floor, department_name, is_technical_area) VALUES
(1, '1', 'ฉุกเฉิน (ER)', FALSE),
(1, '2', 'ศูนย์ระบบทางเดินอาหาร (GI)', FALSE),
-- Replaced 'IT/Dev' with a standard professional term.
(1, '4', 'Technical Support & Infrastructure', TRUE), 
(1, '4', 'อายุรกรรม', FALSE),
(1, '5', 'สำนักงาน ผอ.รพ.', FALSE),
(4, '2', 'Call Center Employee Workspace', FALSE);

-- Insert Sample Assets (From STOCKz-IT screen references)
INSERT INTO Assets (asset_barcode, category, brand, model, department_id, purchase_date, purchase_price, warranty_months, expected_lifespan_months) VALUES
('032186040006', 'Webcam', 'Logitech', 'C930E', 3, '2023-01-15', 3500.00, 36, 60),
('031709030031', 'Monitor', 'Dell', 'E2318H', 3, '2020-05-10', 5000.00, 36, 60),
('030101010001', 'Computer', 'Acer', 'Veriton', 1, '2022-11-20', 15000.00, 36, 60),
('030202020002', 'Barcode Reader', 'IDA', 'ScannerX', 2, '2024-02-01', 2000.00, 12, 36);

-- ==========================================
-- System Audit View: Warranty Status Check
-- ==========================================
-- This view quickly checks if an item is out of warranty.
CREATE VIEW WarrantyStatusCheck AS
SELECT 
    asset_barcode,
    category,
    brand,
    purchase_date,
    warranty_months,
    AGE(CURRENT_DATE, purchase_date) AS current_age,
    CASE 
        WHEN CURRENT_DATE > (purchase_date + (warranty_months || ' months')::INTERVAL) THEN 'Expired'
        ELSE 'Active'
    END AS warranty_status
FROM Assets;
