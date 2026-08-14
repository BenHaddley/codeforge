# 09 — Progress and Gamification

Gamification should reward **demonstrated learning**, not compulsive clicking.

## XP events

Suggested baseline:

| Event | XP |
|---|---:|
| concept check passed | 5 |
| normal assignment passed | 25–75 |
| chapter challenge | 100 |
| mini-project | 250 |
| capstone/boss project | 500+ |

Reading or watching by itself should not be worth meaningful XP.

## Bonus XP

Optional bonuses:
- first-try test pass;
- no-solution completion;
- optional stretch test;
- chapter mastery revisit.

Do not remove already-earned XP for later viewing a hint/solution.

## Level curve

Use a curve rather than fixed 100-XP levels. Example:

```text
XP required for next level ≈ 100 + (level × 35)
```

The exact formula should be easy to change without migrating user data: store cumulative XP, derive level.

## Profile = developer character sheet

Show:
- level;
- total XP;
- current track;
- chapter progress;
- completed projects;
- languages used;
- recent achievements;
- optional streak.

## Streak policy

Do not make streaks punitive. Missing a day should not erase months of progress. If streaks are included, show them as a light encouragement and support a few grace/freeze days.

## Achievements

Good achievements represent meaningful milestones:
- First Program
- First Debug
- Loop Smith — complete loop chapter
- Test Tempered — pass 25 assignments
- Project Shipped — complete a capstone

Avoid achievements for meaningless actions such as opening 50 pages.

## Leaderboard

Leave global leaderboard until server-side grading exists. Local-only XP is trivially editable in developer tools.
