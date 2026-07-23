ALTER TABLE business_records
  DROP INDEX idx_business_source_event,
  DROP INDEX uk_business_raw_event,
  ADD UNIQUE KEY uk_business_source_record (source_system, source_environment, source_record_id);

ALTER TABLE webhook_events
  DROP INDEX uk_webhook_connector_event,
  ADD UNIQUE KEY uk_webhook_source_event (source_system, source_environment, source_event_id);
