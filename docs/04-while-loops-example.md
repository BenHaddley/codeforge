# 04 — Worked Lesson Design: While Loops

Track: **Python Fundamentals**  
Source alignment: **Python Crash Course, 3rd Edition — Chapter 7: User Input and while Loops**  
External reinforcement: **Bro Code — Python Full Course for free (2024), while-loops chapter**

This lesson deliberately uses original Code Forge wording and original exercises.

## Learning objective

After the lesson, the learner can:
- explain what a `while` loop does;
- identify the condition controlling a loop;
- update state so a loop eventually stops;
- use `break` when a clear exit condition is reached;
- avoid accidental infinite loops.

## Original explanation

A `while` loop repeats a block of code for as long as its condition evaluates to `True`. Think of it as an `if` statement that checks again after the block finishes. If the condition is still true, Python runs the block again.

The important part is not the word `while`; it is the **changing state**. Something inside the loop normally changes a variable, receives new input, or reaches a condition that allows the loop to stop. If nothing can make the condition false, the program may run forever.

A useful pattern is:

```python
count = 1
while count <= 5:
    print(count)
    count += 1
```

Before each pass, Python checks `count <= 5`. Inside the loop, `count` increases. Eventually it becomes `6`, the condition becomes false, and execution continues after the loop.

Use a `while` loop when you know **the condition that should end the repetition**, but you do not necessarily know in advance how many repetitions will occur.

## Example to inspect

```python
command = ""

while command != "quit":
    command = input("> ").strip().lower()

    if command == "look":
        print("The forge is glowing.")
    elif command != "quit":
        print("Unknown command")

print("Leaving the forge.")
```

Discussion points:
- `command != "quit"` controls repetition.
- user input changes `command` each pass;
- the loop can therefore terminate;
- the final `print()` executes only after the loop has ended.

## Video reinforcement

Embed the original YouTube player using video ID `ix9cRaBkVe0`.

Start: `6715` seconds (01:51:55)  
End: `7133` seconds (01:58:53)

Suggested embed form:

```html
<iframe
  src="https://www.youtube-nocookie.com/embed/ix9cRaBkVe0?start=6715&end=7133&rel=0"
  title="Bro Code — while loops"
  allowfullscreen>
</iframe>
```

The user remains on Code Forge, but the video is still served by YouTube rather than copied into the project.

## Knowledge check

**Question:** Why does this loop finish?

```python
energy = 3
while energy > 0:
    energy -= 1
```

A. Python only allows three loop iterations.  
B. `energy` decreases until the condition becomes false.  
C. `while` automatically subtracts one.  
D. It does not finish.

Correct answer: **B**.

## Assignment: Forge Countdown

Create a function called `forge_countdown(start)`.

Requirements:
1. Accept a positive integer `start`.
2. Use a `while` loop.
3. Print every number from `start` down to `1`.
4. Print `FORGE!` after the loop ends.
5. Do not use a `for` loop.

Starter code:

```python
def forge_countdown(start):
    # Write your while loop here.
    pass

forge_countdown(5)
```

Expected output:

```text
5
4
3
2
1
FORGE!
```

## Test design

Visible checks:
- function exists;
- output for `start=3` is `3, 2, 1, FORGE!`.

Validation checks:
- output for `start=1`;
- source includes a `while` construct;
- source does not use a `for` construct;
- completion happens within execution timeout.

## Hint ladder

1. What number should change after every pass through the loop?
2. Your condition should stay true while the counter is at least `1`.
3. Print the counter, then subtract one from it.
4. `FORGE!` belongs after the loop, not inside it.

## Completion message

**Quest complete.** You controlled repetition with changing state instead of a fixed number of steps.
