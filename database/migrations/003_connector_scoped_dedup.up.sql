ALTER TABLE webhook_events
  DROP INDEX uk_webhook_source_event,
  ADD UNIQUE KEY uk_webhook_connector_event (connector_id, source_event_id);

ALTER TABLE business_records
  DROP INDEX uk_business_source_record,
  ADD UNIQUE KEY uk_business_raw_event (raw_event_id),
  ADD KEY idx_business_source_event (source_system, source_environment, source_event_id);
