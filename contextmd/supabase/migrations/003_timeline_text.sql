-- Allow free-text timeline descriptions (e.g. "two days ago, but persisted today")
-- Previously DATE, which blocked natural language input from the chat interface
ALTER TABLE cases ALTER COLUMN timeline_start TYPE TEXT;
