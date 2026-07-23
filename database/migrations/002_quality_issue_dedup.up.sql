ALTER TABLE data_quality_issues
  ADD UNIQUE KEY uk_quality_event_type (event_id, issue_type);
