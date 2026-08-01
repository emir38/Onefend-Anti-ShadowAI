use crate::api_client::{ApiClient, LogEventRequest};
use crate::config::AgentConfig;
use anyhow::{Context, Result};
use rusqlite::{params, Connection};
use std::path::Path;
use std::sync::atomic::{AtomicUsize, Ordering};
use std::sync::{Arc, Mutex};
use std::time::{SystemTime, UNIX_EPOCH};
use tracing::{debug, error, info, warn};

/// Represents a queued event with metadata
#[derive(Debug, Clone)]
pub struct QueuedEvent {
    pub id: i64,
    pub device_id: String,
    pub platform: String,
    pub action: String,
    pub risk_level: String,
    pub sensitive_data_detected: bool,
    pub data_types: Vec<String>,
    pub input_length: usize,
    pub analysis_source: String,
    pub confidence: f32,
    pub user_override: Option<bool>,
    pub justification: Option<String>,
    pub evidence: Option<String>,
    pub ai_category: Option<String>,
    pub ai_risk_level: Option<String>,
    pub pattern_matches: serde_json::Value,
    pub retry_count: i32,
    pub created_at: i64,
}

impl QueuedEvent {
    /// Convert to LogEventRequest for API submission
    pub fn to_log_request(&self) -> LogEventRequest {
        LogEventRequest {
            device_id: self.device_id.clone(),
            platform: self.platform.clone(),
            action: self.action.clone(),
            risk_level: self.risk_level.clone(),
            sensitive_data_detected: self.sensitive_data_detected,
            data_types: self.data_types.clone(),
            input_length: self.input_length,
            analysis_source: self.analysis_source.clone(),
            confidence: self.confidence,
            user_override: self.user_override,
            justification: self.justification.clone(),
            evidence: self.evidence.clone(),
            ai_category: self.ai_category.clone(),
            ai_risk_level: self.ai_risk_level.clone(),
            ai_summary: None,
            domain: None,
            conversation_id: None,
            pattern_matches: self.pattern_matches.clone(),
        }
    }
}

/// Persistent event queue using SQLite
pub struct EventQueue {
    conn: Arc<Mutex<Connection>>,
}

impl EventQueue {
    /// Create or open the event queue database
    pub fn new<P: AsRef<Path>>(db_path: P) -> Result<Self> {
        let conn =
            Connection::open(db_path.as_ref()).context("Failed to open event queue database")?;

        // Enable WAL mode for better concurrency and crash resilience
        conn.query_row("PRAGMA journal_mode=WAL", [], |row| row.get::<_, String>(0))
            .context("Failed to enable WAL mode")?;

        // Create table if not exists
        conn.execute(
            "CREATE TABLE IF NOT EXISTS event_queue (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                device_id TEXT NOT NULL,
                platform TEXT NOT NULL,
                action TEXT NOT NULL,
                risk_level TEXT NOT NULL,
                sensitive_data_detected INTEGER NOT NULL,
                data_types TEXT NOT NULL,
                input_length INTEGER NOT NULL,
                analysis_source TEXT NOT NULL,
                confidence REAL NOT NULL,
                user_override INTEGER,
                justification TEXT,
                evidence TEXT,
                ai_category TEXT,
                ai_risk_level TEXT,
                pattern_matches TEXT,
                status TEXT NOT NULL DEFAULT 'PENDING',
                retry_count INTEGER NOT NULL DEFAULT 0,
                last_attempt_at INTEGER,
                created_at INTEGER NOT NULL,
                sent_at INTEGER
            )",
            [],
        )
        .context("Failed to create event_queue table")?;

        // Create indexes for performance
        conn.execute(
            "CREATE INDEX IF NOT EXISTS idx_status ON event_queue(status)",
            [],
        )?;
        conn.execute(
            "CREATE INDEX IF NOT EXISTS idx_created_at ON event_queue(created_at)",
            [],
        )?;

        info!("✅ Event queue initialized at {:?}", db_path.as_ref());

        Ok(EventQueue {
            conn: Arc::new(Mutex::new(conn)),
        })
    }

    /// Enqueue a new event (ACID transaction)
    pub fn enqueue(&self, event: LogEventRequest) -> Result<i64> {
        let conn = self.conn.lock().unwrap();
        let now = SystemTime::now()
            .duration_since(UNIX_EPOCH)
            .unwrap()
            .as_secs() as i64;

        let data_types_json = serde_json::to_string(&event.data_types)?;
        let pattern_matches_json =
            serde_json::to_string(&event.pattern_matches).unwrap_or_else(|_| "{}".to_string());

        conn.execute(
            "INSERT INTO event_queue (
                device_id, platform, action, risk_level, sensitive_data_detected,
                data_types, input_length, analysis_source, confidence,
                user_override, justification, evidence, ai_category, ai_risk_level,
                pattern_matches, created_at
            ) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12, ?13, ?14, ?15, ?16)",
            params![
                event.device_id,
                event.platform,
                event.action,
                event.risk_level,
                event.sensitive_data_detected as i32,
                data_types_json,
                event.input_length as i64,
                event.analysis_source,
                event.confidence,
                event.user_override.map(|b| b as i32),
                event.justification,
                event.evidence,
                event.ai_category,
                event.ai_risk_level,
                pattern_matches_json,
                now,
            ],
        )?;

        let id = conn.last_insert_rowid();
        debug!("📥 Event enqueued with ID: {}", id);
        Ok(id)
    }

    /// Dequeue pending events (oldest first)
    pub fn dequeue_pending(&self, limit: usize) -> Result<Vec<QueuedEvent>> {
        let conn = self.conn.lock().unwrap();
        let mut stmt = conn.prepare(
            "SELECT id, device_id, platform, action, risk_level, sensitive_data_detected,
                    data_types, input_length, analysis_source, confidence,
                    user_override, justification, evidence, ai_category, ai_risk_level,
                    pattern_matches, retry_count, created_at
             FROM event_queue
             WHERE status = 'PENDING'
             ORDER BY created_at ASC
             LIMIT ?1",
        )?;

        let events = stmt.query_map(params![limit], |row| {
            let data_types_str: String = row.get(6)?;
            let data_types: Vec<String> = serde_json::from_str(&data_types_str).unwrap_or_default();

            let pattern_matches_str: Option<String> = row.get(15)?;
            let pattern_matches: serde_json::Value = pattern_matches_str
                .and_then(|s| serde_json::from_str(&s).ok())
                .unwrap_or_else(|| serde_json::json!({}));

            Ok(QueuedEvent {
                id: row.get(0)?,
                device_id: row.get(1)?,
                platform: row.get(2)?,
                action: row.get(3)?,
                risk_level: row.get(4)?,
                sensitive_data_detected: row.get::<_, i32>(5)? != 0,
                data_types,
                input_length: row.get::<_, i64>(7)? as usize,
                analysis_source: row.get(8)?,
                confidence: row.get(9)?,
                user_override: row.get::<_, Option<i32>>(10)?.map(|v| v != 0),
                justification: row.get(11)?,
                evidence: row.get(12)?,
                ai_category: row.get(13)?,
                ai_risk_level: row.get(14)?,
                pattern_matches,
                retry_count: row.get(16)?,
                created_at: row.get(17)?,
            })
        })?;

        let mut result = Vec::new();
        for event in events {
            result.push(event?);
        }

        Ok(result)
    }

    /// Mark event as successfully sent
    pub fn mark_sent(&self, id: i64) -> Result<()> {
        let conn = self.conn.lock().unwrap();
        let now = SystemTime::now()
            .duration_since(UNIX_EPOCH)
            .unwrap()
            .as_secs() as i64;

        conn.execute(
            "UPDATE event_queue SET status = 'SENT', sent_at = ?1 WHERE id = ?2",
            params![now, id],
        )?;

        debug!("✅ Event {} marked as SENT", id);
        Ok(())
    }

    /// Mark event as failed (increment retry count)
    pub fn mark_failed(&self, id: i64) -> Result<()> {
        let conn = self.conn.lock().unwrap();
        let now = SystemTime::now()
            .duration_since(UNIX_EPOCH)
            .unwrap()
            .as_secs() as i64;

        conn.execute(
            "UPDATE event_queue SET retry_count = retry_count + 1, last_attempt_at = ?1 WHERE id = ?2",
            params![now, id],
        )?;

        debug!("⚠️ Event {} marked as FAILED (retry incremented)", id);
        Ok(())
    }

    /// Get queue statistics
    pub fn get_stats(&self) -> Result<QueueStats> {
        let conn = self.conn.lock().unwrap();

        let pending: i64 = conn.query_row(
            "SELECT COUNT(*) FROM event_queue WHERE status = 'PENDING'",
            [],
            |row| row.get(0),
        )?;

        let sent: i64 = conn.query_row(
            "SELECT COUNT(*) FROM event_queue WHERE status = 'SENT'",
            [],
            |row| row.get(0),
        )?;

        let failed: i64 = conn.query_row(
            "SELECT COUNT(*) FROM event_queue WHERE status = 'FAILED'",
            [],
            |row| row.get(0),
        )?;

        Ok(QueueStats {
            pending: pending as usize,
            sent: sent as usize,
            failed: failed as usize,
        })
    }

    /// Cleanup old SENT events (older than retention_days)
    pub fn cleanup_old_events(&self, retention_days: i64) -> Result<usize> {
        let conn = self.conn.lock().unwrap();
        let cutoff = SystemTime::now()
            .duration_since(UNIX_EPOCH)
            .unwrap()
            .as_secs() as i64
            - (retention_days * 24 * 60 * 60);

        let deleted = conn.execute(
            "DELETE FROM event_queue WHERE status = 'SENT' AND sent_at < ?1",
            params![cutoff],
        )?;

        if deleted > 0 {
            info!(
                "🗑️ Cleaned up {} old SENT events (retention: {} days)",
                deleted, retention_days
            );
        }

        Ok(deleted)
    }
}

#[derive(Debug)]
pub struct QueueStats {
    pub pending: usize,
    pub sent: usize,
    pub failed: usize,
}

/// Background worker that processes the event queue
pub struct QueueWorker {
    queue: Arc<Mutex<EventQueue>>,
    api_client: Arc<std::sync::RwLock<ApiClient>>,
}

impl QueueWorker {
    pub fn new(
        queue: Arc<Mutex<EventQueue>>,
        api_client: Arc<std::sync::RwLock<ApiClient>>,
    ) -> Self {
        QueueWorker { queue, api_client }
    }

    /// Start the worker loop
    pub async fn start(self, config: Arc<Mutex<AgentConfig>>) {
        info!("🔄 Event queue worker started");
        let mut interval = tokio::time::interval(tokio::time::Duration::from_secs(5));
        static TICK_COUNTER: AtomicUsize = AtomicUsize::new(0);

        loop {
            interval.tick().await;

            // Get device token
            let token = {
                let cfg = config.lock().unwrap();
                cfg.device_token.clone()
            };

            if token.is_none() {
                debug!("⏭️ Queue worker skipped: No device token");
                continue;
            }

            let token = token.unwrap();

            // Process pending events
            if let Err(e) = self.process_pending(&token).await {
                error!("Queue worker error: {}", e);
            }

            // Periodic cleanup every ~1000 ticks (~83 minutes at 5s interval)
            let tick = TICK_COUNTER.fetch_add(1, Ordering::Relaxed);
            if tick >= 1000 {
                TICK_COUNTER.store(0, Ordering::Relaxed);
                if let Ok(queue) = self.queue.lock() {
                    if let Err(e) = queue.cleanup_old_events(7) {
                        warn!("Failed to cleanup old events: {}", e);
                    }
                }
            }
        }
    }

    async fn process_pending(&self, token: &str) -> Result<()> {
        let events = {
            let queue = self.queue.lock().unwrap();
            queue.dequeue_pending(10)?
        };

        if events.is_empty() {
            return Ok(());
        }

        debug!("📤 Processing {} pending events", events.len());

        for event in events {
            let request = event.to_log_request();
            let client = self.api_client.read().unwrap().clone();

            match client.log_event(token, request).await {
                Ok(_) => {
                    let queue = self.queue.lock().unwrap();
                    queue.mark_sent(event.id)?;
                    info!("✅ Event {} sent successfully", event.id);
                }
                Err(e) => {
                    error!("❌ Failed to send event {}: {}", event.id, e);
                    {
                        // Scoped lock — MUST be dropped before the .await below
                        let queue = self.queue.lock().unwrap();
                        queue.mark_failed(event.id)?;
                    } // MutexGuard dropped here

                    // Exponential backoff: sleep 2^retry_count seconds (max 60s)
                    let backoff_secs = std::cmp::min(2_u64.pow(event.retry_count as u32), 60);
                    tokio::time::sleep(tokio::time::Duration::from_secs(backoff_secs)).await;
                }
            }
        }

        Ok(())
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use tempfile::tempdir;

    #[test]
    fn test_enqueue_and_dequeue() {
        let dir = tempdir().unwrap();
        let db_path = dir.path().join("test.db");
        let queue = EventQueue::new(&db_path).unwrap();

        let event = LogEventRequest {
            device_id: "test-device".to_string(),
            platform: "Desktop".to_string(),
            action: "ALLOW".to_string(),
            risk_level: "LOW".to_string(),
            sensitive_data_detected: false,
            data_types: vec!["NONE".to_string()],
            input_length: 100,
            analysis_source: "AI".to_string(),
            confidence: 0.95,
            user_override: None,
            justification: None,
            evidence: None,
            ai_category: None,
            ai_risk_level: None,
            ai_summary: None,
            domain: None,
            conversation_id: None,
            pattern_matches: serde_json::json!({}),
        };

        // Enqueue
        let id = queue.enqueue(event).unwrap();
        assert!(id > 0);

        // Dequeue
        let pending = queue.dequeue_pending(10).unwrap();
        assert_eq!(pending.len(), 1);
        assert_eq!(pending[0].device_id, "test-device");
    }

    #[test]
    fn test_mark_sent() {
        let dir = tempdir().unwrap();
        let db_path = dir.path().join("test.db");
        let queue = EventQueue::new(&db_path).unwrap();

        let event = LogEventRequest {
            device_id: "test-device".to_string(),
            platform: "Desktop".to_string(),
            action: "ALLOW".to_string(),
            risk_level: "LOW".to_string(),
            sensitive_data_detected: false,
            data_types: vec![],
            input_length: 100,
            analysis_source: "AI".to_string(),
            confidence: 0.95,
            user_override: None,
            justification: None,
            evidence: None,
            ai_category: None,
            ai_risk_level: None,
            ai_summary: None,
            domain: None,
            conversation_id: None,
            pattern_matches: serde_json::json!({}),
        };

        let id = queue.enqueue(event).unwrap();
        queue.mark_sent(id).unwrap();

        let pending = queue.dequeue_pending(10).unwrap();
        assert_eq!(pending.len(), 0);
    }

    #[test]
    fn test_retry_count() {
        let dir = tempdir().unwrap();
        let db_path = dir.path().join("test.db");
        let queue = EventQueue::new(&db_path).unwrap();

        let event = LogEventRequest {
            device_id: "test-device".to_string(),
            platform: "Desktop".to_string(),
            action: "ALLOW".to_string(),
            risk_level: "LOW".to_string(),
            sensitive_data_detected: false,
            data_types: vec![],
            input_length: 100,
            analysis_source: "AI".to_string(),
            confidence: 0.95,
            user_override: None,
            justification: None,
            evidence: None,
            ai_category: None,
            ai_risk_level: None,
            ai_summary: None,
            domain: None,
            conversation_id: None,
            pattern_matches: serde_json::json!({}),
        };

        let id = queue.enqueue(event).unwrap();

        // Mark failed 3 times
        queue.mark_failed(id).unwrap();
        queue.mark_failed(id).unwrap();
        queue.mark_failed(id).unwrap();

        let pending = queue.dequeue_pending(10).unwrap();
        assert_eq!(pending[0].retry_count, 3);
    }
}
