CREATE TABLE IF NOT EXISTS auth_users (
  user_id CHAR(36) PRIMARY KEY,
  username VARCHAR(128) NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  display_name VARCHAR(128) NOT NULL,
  organization_name VARCHAR(191) NOT NULL,
  organization_type VARCHAR(32) NOT NULL,
  role VARCHAR(32) NOT NULL,
  status VARCHAR(32) NOT NULL DEFAULT 'active',
  failed_login_count INT NOT NULL DEFAULT 0,
  locked_until DATETIME(3) NULL,
  password_changed_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  last_login_at DATETIME(3) NULL,
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  UNIQUE KEY uk_auth_user_username (username),
  KEY idx_auth_user_status_role (status, role),
  CONSTRAINT chk_auth_user_role CHECK (role IN ('admin', 'project_viewer')),
  CONSTRAINT chk_auth_user_status CHECK (status IN ('active', 'disabled', 'locked')),
  CONSTRAINT chk_auth_user_org_type CHECK (organization_type IN ('anxun', 'government', 'insurer'))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE IF NOT EXISTS auth_user_projects (
  user_id CHAR(36) NOT NULL,
  project_id VARCHAR(64) NOT NULL,
  can_download_summary TINYINT(1) NOT NULL DEFAULT 1,
  can_download_detail TINYINT(1) NOT NULL DEFAULT 0,
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (user_id, project_id),
  KEY idx_auth_project_user (project_id, user_id),
  CONSTRAINT fk_auth_user_project_user
    FOREIGN KEY (user_id) REFERENCES auth_users(user_id) ON DELETE CASCADE,
  CONSTRAINT fk_auth_user_project_project
    FOREIGN KEY (project_id) REFERENCES projects(project_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE IF NOT EXISTS auth_sessions (
  session_id CHAR(36) PRIMARY KEY,
  user_id CHAR(36) NOT NULL,
  token_hash CHAR(64) NOT NULL,
  csrf_token_hash CHAR(64) NOT NULL,
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  last_seen_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  idle_expires_at DATETIME(3) NOT NULL,
  absolute_expires_at DATETIME(3) NOT NULL,
  revoked_at DATETIME(3) NULL,
  revoke_reason VARCHAR(128) NOT NULL DEFAULT '',
  ip_address VARCHAR(64) NOT NULL DEFAULT '',
  user_agent VARCHAR(512) NOT NULL DEFAULT '',
  UNIQUE KEY uk_auth_session_token_hash (token_hash),
  KEY idx_auth_session_user_active (user_id, revoked_at, absolute_expires_at),
  KEY idx_auth_session_expiry (idle_expires_at, absolute_expires_at),
  CONSTRAINT fk_auth_session_user
    FOREIGN KEY (user_id) REFERENCES auth_users(user_id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE IF NOT EXISTS auth_audit_logs (
  audit_id CHAR(36) PRIMARY KEY,
  user_id CHAR(36) NULL,
  username VARCHAR(128) NOT NULL DEFAULT '',
  organization_name VARCHAR(191) NOT NULL DEFAULT '',
  action VARCHAR(64) NOT NULL,
  result_status VARCHAR(32) NOT NULL,
  project_id VARCHAR(64) NULL,
  resource_type VARCHAR(64) NOT NULL DEFAULT '',
  resource_id VARCHAR(191) NOT NULL DEFAULT '',
  request_id VARCHAR(128) NOT NULL DEFAULT '',
  ip_address VARCHAR(64) NOT NULL DEFAULT '',
  user_agent VARCHAR(512) NOT NULL DEFAULT '',
  detail_json JSON NULL,
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  KEY idx_auth_audit_user_time (user_id, created_at),
  KEY idx_auth_audit_action_time (action, created_at),
  KEY idx_auth_audit_project_time (project_id, created_at),
  CONSTRAINT fk_auth_audit_user
    FOREIGN KEY (user_id) REFERENCES auth_users(user_id) ON DELETE SET NULL,
  CONSTRAINT fk_auth_audit_project
    FOREIGN KEY (project_id) REFERENCES projects(project_id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE IF NOT EXISTS download_audit_logs (
  download_id CHAR(36) PRIMARY KEY,
  user_id CHAR(36) NULL,
  username VARCHAR(128) NOT NULL DEFAULT '',
  organization_name VARCHAR(191) NOT NULL DEFAULT '',
  project_id VARCHAR(64) NOT NULL,
  download_type VARCHAR(64) NOT NULL,
  filters_json JSON NULL,
  file_name VARCHAR(255) NOT NULL DEFAULT '',
  result_status VARCHAR(32) NOT NULL,
  row_count INT NOT NULL DEFAULT 0,
  request_id VARCHAR(128) NOT NULL DEFAULT '',
  ip_address VARCHAR(64) NOT NULL DEFAULT '',
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  KEY idx_download_user_time (user_id, created_at),
  KEY idx_download_project_time (project_id, created_at),
  KEY idx_download_type_time (download_type, created_at),
  CONSTRAINT fk_download_audit_user
    FOREIGN KEY (user_id) REFERENCES auth_users(user_id) ON DELETE SET NULL,
  CONSTRAINT fk_download_audit_project
    FOREIGN KEY (project_id) REFERENCES projects(project_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
