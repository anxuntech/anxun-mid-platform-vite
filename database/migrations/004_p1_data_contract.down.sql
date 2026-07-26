ALTER TABLE data_quality_issues
  DROP INDEX idx_quality_event_status;

ALTER TABLE companies
  DROP COLUMN contact_phone,
  DROP COLUMN contact_name,
  DROP COLUMN address;

ALTER TABLE source_connectors
  DROP FOREIGN KEY fk_connector_project,
  DROP INDEX idx_connector_project_environment,
  DROP COLUMN project_id;

ALTER TABLE webhook_events
  DROP COLUMN parse_error,
  DROP COLUMN raw_body;
