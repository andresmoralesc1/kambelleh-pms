# Kambelleh PMS - Health Check Configuration

## Built-in Health Endpoint

The backend exposes a health check at `GET /api/health` that returns:
```json
{"status":"ok","timestamp":"2026-05-18T...","uptime":12345}
```

## External Monitoring Setup

### UptimeRobot (Free - Recommended)
1. Create account at https://uptimerobot.com
2. Add monitor:
   - Monitor type: HTTP(s)
   - Friendly name: Kambelleh PMS API
   - URL: `https://kambelleh.com/api/health`
   - Monitoring interval: 5 minutes (free tier)
   - Timeout: 30 seconds
3. Set up alert contacts (email/Slack/PagerDuty)

### Alternative: Cron-job.org
1. Create account at https://cron-job.org
2. Create job:
   - URL: `https://kambelleh.com/api/health`
   - Schedule: Every 5 minutes
   - Timeout: 10 seconds
3. Enable notifications on failure

### Linux Cron (Self-hosted)
Add to crontab:
```
*/5 * * * * curl -sf https://kambelleh.com/api/health || echo "ALERT: Kambelleh down" | mail -s "Kambelleh Alert" admin@kambelleh.com
```

## Docker Health Check

Already configured in docker-compose.yml:
```yaml
healthcheck:
  test: ["CMD-SHELL", "wget -qO- http://localhost:3001/api/health || exit 1"]
  interval: 30s
  timeout: 10s
  retries: 3
```

## Alerting Triggers

Configure alerts if:
- Response code != 200
- Response time > 3 seconds
- No response (timeout)

## Log Aggregation (Optional)

For centralized logging, configure Filebeat or similar to ship nginx/backend logs to:
- ELK Stack (Elasticsearch + Kibana)
- Grafana + Loki
- CloudWatch (AWS)