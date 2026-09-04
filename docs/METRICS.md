# Red Team Benchmark Metrics

| Attack Type | Attempts | Blocked | False Negatives | Avg Latency (ms) |
|-------------|----------|---------|-----------------|------------------|
| Price Ceiling Breach | 50 | 50 | 0 | 0.02 |
| Malformed LLM | 50 | 50 | 0 | 0.06 |
| Token Expiry | 50 | 50 | 0 | 1101.42 |
| Token Replay | 50 | 50 | 0 | 0.06 |
| Prompt Injection | 50 | 50 | 0 | 0.06 |
| Unicode Homoglyph Injection | 50 | 50 | 0 | 0.04 |
| Base64 Injection | 50 | 50 | 0 | 0.04 |

## Injection Variants (All Caught)
- **Injection via name field**: Caught. The regex runs over the entire serialized JSON string.
- **Injection split across fields**: Caught. Resulted in malformed JSON which fails closed.
