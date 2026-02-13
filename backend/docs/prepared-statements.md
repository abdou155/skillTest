# Why Use Prepared & Cached Statements for PostgreSQL

## Without Prepared Statements (Default)

Every time you run a query, PostgreSQL does **5 steps**:

```
Parse SQL → Rewrite → Plan → Optimize → Execute
```

If you call `SELECT * FROM users WHERE id = $1` **100 times**, PostgreSQL does all 5 steps **100 times** — even though the query is identical every time.

## With Named Prepared Statements

PostgreSQL does steps 1–4 **once**, then **reuses the cached plan**:

```
1st call:  Parse → Rewrite → Plan → Optimize → Execute   (full work)
2nd call:  Execute                                         (cached plan)
3rd call:  Execute                                         (cached plan)
...
```

## Real-World Analogy

Think of it like GPS navigation:

- **Without caching**: You recalculate the entire route every time you drive to work, even though it's the same destination every day.
- **With caching**: You calculate the route once, save it, and just follow it every morning.

## When It Matters Most

| Scenario | Benefit |
|---|---|
| **High-traffic endpoints** (e.g. GET /students) | Eliminates repeated planning overhead on every request |
| **Complex queries** (JOINs, subqueries) | Planning is expensive — caching saves the most here |
| **Stored procedure calls** | Plan includes function resolution — skip it on reuse |

## What About Security?

Both parameterized queries and prepared statements are **equally safe** from SQL injection — values are always separated from the query. Prepared statements just add the **performance** benefit of plan caching.

## Comparison

| | Regular Parameterized | Named Prepared Statement |
|---|---|---|
| **SQL injection safe** | Yes | Yes |
| **Plans query every call** | Yes (wasteful) | No (cached after 1st) |
| **Best for repeated queries** | No | Yes |
| **Code complexity** | Minimal | +1 line (add a `name`) |

## Code Example (node-postgres)

### Before (parameterized, re-planned every call)

```js
const result = await db.query(
    "SELECT * FROM users WHERE id = $1",
    [userId]
);
```

### After (named prepared statement, plan cached after 1st call)

```js
const result = await db.query({
    name: "find-user-by-id",
    text: "SELECT * FROM users WHERE id = $1",
    values: [userId],
});
```

## TL;DR

**One extra line of code → skip query planning on every repeated call.**
