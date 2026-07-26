ALTER TABLE webhook_events
  ADD COLUMN raw_body LONGTEXT NULL AFTER payload_json,
  ADD COLUMN parse_error VARCHAR(1000) NOT NULL DEFAULT '' AFTER raw_body;

ALTER TABLE source_connectors
  ADD COLUMN project_id VARCHAR(64) NULL AFTER source_environment,
  ADD KEY idx_connector_project_environment (project_id, source_environment, enabled);

UPDATE source_connectors
   SET project_id = 'pingxiang'
 WHERE connector_key LIKE 'caoliao-pingxiang-%';

ALTER TABLE source_connectors
  ADD CONSTRAINT fk_connector_project
  FOREIGN KEY (project_id) REFERENCES projects(project_id);

ALTER TABLE companies
  ADD COLUMN address VARCHAR(255) NOT NULL DEFAULT '' AFTER industry,
  ADD COLUMN contact_name VARCHAR(128) NOT NULL DEFAULT '' AFTER address,
  ADD COLUMN contact_phone VARCHAR(64) NOT NULL DEFAULT '' AFTER contact_name;

ALTER TABLE data_quality_issues
  ADD KEY idx_quality_event_status (event_id, status);
