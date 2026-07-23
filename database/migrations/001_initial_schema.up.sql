CREATE TABLE IF NOT EXISTS schema_migrations (
  version VARCHAR(64) PRIMARY KEY,
  checksum CHAR(64) NOT NULL,
  applied_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE IF NOT EXISTS counties (
  county_id VARCHAR(64) PRIMARY KEY,
  county_slug VARCHAR(64) NOT NULL UNIQUE,
  county_name VARCHAR(128) NOT NULL,
  status VARCHAR(32) NOT NULL DEFAULT 'active',
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE IF NOT EXISTS projects (
  project_id VARCHAR(64) PRIMARY KEY,
  county_id VARCHAR(64) NOT NULL,
  project_slug VARCHAR(64) NOT NULL UNIQUE,
  project_name VARCHAR(128) NOT NULL,
  status VARCHAR(32) NOT NULL DEFAULT 'active',
  started_at DATETIME(3) NULL,
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  CONSTRAINT fk_projects_county FOREIGN KEY (county_id) REFERENCES counties(county_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE IF NOT EXISTS companies (
  company_id VARCHAR(64) PRIMARY KEY,
  project_id VARCHAR(64) NOT NULL,
  company_name VARCHAR(191) NOT NULL,
  industry VARCHAR(128) NOT NULL DEFAULT '',
  status VARCHAR(32) NOT NULL DEFAULT 'active',
  enabled_at DATETIME(3) NULL,
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  UNIQUE KEY uk_company_project_name (project_id, company_name),
  KEY idx_company_project_status (project_id, status),
  CONSTRAINT fk_companies_project FOREIGN KEY (project_id) REFERENCES projects(project_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE IF NOT EXISTS source_connectors (
  connector_id VARCHAR(64) PRIMARY KEY,
  connector_key VARCHAR(128) NOT NULL UNIQUE,
  source_system VARCHAR(64) NOT NULL,
  source_environment VARCHAR(16) NOT NULL DEFAULT 'test',
  enabled TINYINT(1) NOT NULL DEFAULT 0,
  configuration_json JSON NULL,
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  CONSTRAINT chk_connector_environment CHECK (source_environment IN ('demo', 'test', 'real'))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE IF NOT EXISTS source_company_mappings (
  mapping_id CHAR(36) PRIMARY KEY,
  connector_id VARCHAR(64) NOT NULL,
  company_id VARCHAR(64) NOT NULL,
  source_company_key VARCHAR(191) NOT NULL,
  source_company_name VARCHAR(191) NOT NULL DEFAULT '',
  source_company_name_normalized VARCHAR(191) NOT NULL,
  form_number VARCHAR(64) NOT NULL DEFAULT '',
  partition_id VARCHAR(128) NOT NULL DEFAULT '',
  status VARCHAR(32) NOT NULL DEFAULT 'active',
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  UNIQUE KEY uk_source_company_mapping (connector_id, source_company_key, form_number, partition_id),
  KEY idx_mapping_normalized_name (connector_id, source_company_name_normalized, status),
  CONSTRAINT fk_mapping_connector FOREIGN KEY (connector_id) REFERENCES source_connectors(connector_id),
  CONSTRAINT fk_mapping_company FOREIGN KEY (company_id) REFERENCES companies(company_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE IF NOT EXISTS webhook_events (
  event_id CHAR(36) PRIMARY KEY,
  connector_id VARCHAR(64) NOT NULL,
  source_system VARCHAR(64) NOT NULL,
  source_environment VARCHAR(16) NOT NULL,
  source_event_id VARCHAR(191) NOT NULL,
  request_id VARCHAR(191) NOT NULL,
  received_at DATETIME(3) NOT NULL,
  payload_json JSON NOT NULL,
  payload_hash CHAR(64) NOT NULL,
  headers_json JSON NULL,
  parse_status VARCHAR(32) NOT NULL DEFAULT 'received',
  error_message TEXT NULL,
  processed_at DATETIME(3) NULL,
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  UNIQUE KEY uk_webhook_source_event (source_system, source_environment, source_event_id),
  KEY idx_webhook_status_time (parse_status, received_at),
  KEY idx_webhook_payload_hash (payload_hash),
  CONSTRAINT chk_event_environment CHECK (source_environment IN ('demo', 'test', 'real')),
  CONSTRAINT fk_webhook_connector FOREIGN KEY (connector_id) REFERENCES source_connectors(connector_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE IF NOT EXISTS business_records (
  record_id CHAR(36) PRIMARY KEY,
  county_id VARCHAR(64) NOT NULL,
  project_id VARCHAR(64) NOT NULL,
  company_id VARCHAR(64) NOT NULL,
  record_type VARCHAR(32) NOT NULL,
  source_system VARCHAR(64) NOT NULL,
  source_environment VARCHAR(16) NOT NULL,
  source_record_id VARCHAR(191) NOT NULL,
  source_event_id VARCHAR(191) NOT NULL,
  business_status VARCHAR(64) NOT NULL DEFAULT '',
  title VARCHAR(255) NOT NULL DEFAULT '',
  summary TEXT NULL,
  occurred_at DATETIME(3) NOT NULL,
  raw_event_id CHAR(36) NOT NULL,
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  UNIQUE KEY uk_business_source_record (source_system, source_environment, source_record_id),
  KEY idx_business_company_time (company_id, occurred_at),
  KEY idx_business_project_type_time (project_id, record_type, occurred_at),
  CONSTRAINT chk_business_environment CHECK (source_environment IN ('demo', 'test', 'real')),
  CONSTRAINT fk_business_county FOREIGN KEY (county_id) REFERENCES counties(county_id),
  CONSTRAINT fk_business_project FOREIGN KEY (project_id) REFERENCES projects(project_id),
  CONSTRAINT fk_business_company FOREIGN KEY (company_id) REFERENCES companies(company_id),
  CONSTRAINT fk_business_event FOREIGN KEY (raw_event_id) REFERENCES webhook_events(event_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE IF NOT EXISTS hazard_records (
  hazard_id CHAR(36) PRIMARY KEY,
  record_id CHAR(36) NOT NULL UNIQUE,
  description TEXT NULL,
  hazard_level VARCHAR(64) NOT NULL DEFAULT '',
  reporter_name VARCHAR(128) NOT NULL DEFAULT '',
  reported_at DATETIME(3) NOT NULL,
  assignee_name VARCHAR(128) NOT NULL DEFAULT '',
  rectification_deadline DATETIME(3) NULL,
  rectified_at DATETIME(3) NULL,
  closed_at DATETIME(3) NULL,
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  CONSTRAINT fk_hazard_business FOREIGN KEY (record_id) REFERENCES business_records(record_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE IF NOT EXISTS inspection_records (
  inspection_id CHAR(36) PRIMARY KEY,
  record_id CHAR(36) NOT NULL UNIQUE,
  inspection_type VARCHAR(128) NOT NULL DEFAULT '',
  point_name VARCHAR(255) NOT NULL DEFAULT '',
  inspector_name VARCHAR(128) NOT NULL DEFAULT '',
  inspected_at DATETIME(3) NOT NULL,
  item_count INT NOT NULL DEFAULT 0,
  abnormal_count INT NOT NULL DEFAULT 0,
  result VARCHAR(128) NOT NULL DEFAULT '',
  linked_hazard_id CHAR(36) NULL,
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  CONSTRAINT fk_inspection_business FOREIGN KEY (record_id) REFERENCES business_records(record_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE IF NOT EXISTS work_permit_records (
  work_permit_id CHAR(36) PRIMARY KEY,
  record_id CHAR(36) NOT NULL UNIQUE,
  permit_type VARCHAR(128) NOT NULL DEFAULT '',
  applicant_name VARCHAR(128) NOT NULL DEFAULT '',
  location VARCHAR(255) NOT NULL DEFAULT '',
  planned_start DATETIME(3) NULL,
  planned_end DATETIME(3) NULL,
  guardian_name VARCHAR(128) NOT NULL DEFAULT '',
  completed_at DATETIME(3) NULL,
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  CONSTRAINT fk_permit_business FOREIGN KEY (record_id) REFERENCES business_records(record_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE IF NOT EXISTS training_records (
  training_id CHAR(36) PRIMARY KEY,
  record_id CHAR(36) NOT NULL UNIQUE,
  title VARCHAR(255) NOT NULL DEFAULT '',
  participant_name VARCHAR(128) NOT NULL DEFAULT '',
  training_method VARCHAR(128) NOT NULL DEFAULT '',
  started_at DATETIME(3) NULL,
  ended_at DATETIME(3) NULL,
  exam_score DECIMAL(6,2) NULL,
  passed TINYINT(1) NULL,
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  CONSTRAINT fk_training_business FOREIGN KEY (record_id) REFERENCES business_records(record_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE IF NOT EXISTS record_attachments (
  attachment_id CHAR(36) PRIMARY KEY,
  record_id CHAR(36) NOT NULL,
  file_name VARCHAR(255) NOT NULL DEFAULT '',
  file_url TEXT NOT NULL,
  content_type VARCHAR(128) NOT NULL DEFAULT '',
  file_size BIGINT NULL,
  collected_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  KEY idx_attachment_record (record_id),
  CONSTRAINT fk_attachment_business FOREIGN KEY (record_id) REFERENCES business_records(record_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE IF NOT EXISTS data_import_batches (
  batch_id CHAR(36) PRIMARY KEY,
  source_file VARCHAR(512) NOT NULL,
  source_environment VARCHAR(16) NOT NULL DEFAULT 'test',
  source_checksum CHAR(64) NOT NULL,
  started_at DATETIME(3) NOT NULL,
  finished_at DATETIME(3) NULL,
  total_rows INT NOT NULL DEFAULT 0,
  inserted_rows INT NOT NULL DEFAULT 0,
  duplicate_rows INT NOT NULL DEFAULT 0,
  failed_rows INT NOT NULL DEFAULT 0,
  unmatched_rows INT NOT NULL DEFAULT 0,
  status VARCHAR(32) NOT NULL DEFAULT 'running',
  summary_json JSON NULL,
  CONSTRAINT chk_import_environment CHECK (source_environment IN ('demo', 'test', 'real'))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE IF NOT EXISTS migration_logs (
  migration_log_id CHAR(36) PRIMARY KEY,
  batch_id CHAR(36) NULL,
  source_line INT NULL,
  source_event_id VARCHAR(191) NOT NULL DEFAULT '',
  result_status VARCHAR(32) NOT NULL,
  message TEXT NULL,
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  KEY idx_migration_batch_status (batch_id, result_status),
  CONSTRAINT fk_migration_batch FOREIGN KEY (batch_id) REFERENCES data_import_batches(batch_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE IF NOT EXISTS data_quality_issues (
  issue_id CHAR(36) PRIMARY KEY,
  event_id CHAR(36) NULL,
  issue_type VARCHAR(64) NOT NULL,
  severity VARCHAR(16) NOT NULL DEFAULT 'warning',
  source_company_key VARCHAR(191) NOT NULL DEFAULT '',
  source_company_name VARCHAR(191) NOT NULL DEFAULT '',
  detail_json JSON NULL,
  status VARCHAR(32) NOT NULL DEFAULT 'open',
  resolved_company_id VARCHAR(64) NULL,
  resolved_at DATETIME(3) NULL,
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  KEY idx_quality_status_type (status, issue_type),
  CONSTRAINT fk_quality_event FOREIGN KEY (event_id) REFERENCES webhook_events(event_id),
  CONSTRAINT fk_quality_company FOREIGN KEY (resolved_company_id) REFERENCES companies(company_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE IF NOT EXISTS event_replay_jobs (
  replay_job_id CHAR(36) PRIMARY KEY,
  event_id CHAR(36) NOT NULL,
  status VARCHAR(32) NOT NULL DEFAULT 'pending',
  attempts INT NOT NULL DEFAULT 0,
  requested_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  started_at DATETIME(3) NULL,
  finished_at DATETIME(3) NULL,
  last_error TEXT NULL,
  KEY idx_replay_event (event_id),
  KEY idx_replay_status_time (status, requested_at),
  CONSTRAINT fk_replay_event FOREIGN KEY (event_id) REFERENCES webhook_events(event_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
