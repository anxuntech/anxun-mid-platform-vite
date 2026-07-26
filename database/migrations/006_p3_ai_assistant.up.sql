CREATE TABLE IF NOT EXISTS ai_query_audit_logs (
  audit_id CHAR(36) PRIMARY KEY,
  user_id CHAR(36) NULL,
  username VARCHAR(128) NOT NULL DEFAULT '',
  organization_name VARCHAR(191) NOT NULL DEFAULT '',
  project_id VARCHAR(64) NOT NULL,
  question_redacted VARCHAR(1000) NOT NULL DEFAULT '',
  question_hash CHAR(64) NOT NULL,
  intent VARCHAR(64) NOT NULL DEFAULT '',
  query_scope_json JSON NULL,
  result_count INT NOT NULL DEFAULT 0,
  duration_ms INT NOT NULL DEFAULT 0,
  model_name VARCHAR(64) NOT NULL DEFAULT '',
  input_tokens INT NOT NULL DEFAULT 0,
  output_tokens INT NOT NULL DEFAULT 0,
  result_status VARCHAR(32) NOT NULL,
  error_code VARCHAR(64) NOT NULL DEFAULT '',
  request_id VARCHAR(128) NOT NULL DEFAULT '',
  ip_address VARCHAR(64) NOT NULL DEFAULT '',
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  KEY idx_ai_query_user_time (user_id, created_at),
  KEY idx_ai_query_project_time (project_id, created_at),
  KEY idx_ai_query_intent_time (intent, created_at),
  CONSTRAINT fk_ai_query_user
    FOREIGN KEY (user_id) REFERENCES auth_users(user_id) ON DELETE SET NULL,
  CONSTRAINT fk_ai_query_project
    FOREIGN KEY (project_id) REFERENCES projects(project_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
