# /restart Command

Restarts the CasperBot application by running the `restart.sh` script located at the project root.

## Arguments Received

`$ARGUMENTS`

If arguments are provided, pass them along to the restart script. Otherwise, run it with no arguments.

## Instructions

When this command is invoked, follow these steps exactly:

1. **Navigate to the project root** — the script lives at `restart.sh` in the repository root (the directory containing this `.claude/` folder).

2. **Run the restart script** using the Bash tool (use the working directory as the project root):
   ```
   bash "./restart.sh" $ARGUMENTS
   ```

3. **Stream and display the output** — show the script's stdout/stderr to the user in real time so they can see startup progress, errors, and confirmation messages.

4. **Report the result** — after the script exits:
   - If exit code is `0`: confirm the restart succeeded and note any relevant URLs or ports reported by the script.
   - If exit code is non-zero: report the failure, show the relevant error output, and suggest next steps (e.g., check logs, verify ports are free).

## Output Format

- Keep your response brief — let the script output speak for itself.
- After the script completes, summarize in one or two sentences: what restarted, on which ports, and whether it succeeded.
- If the restart failed, clearly state what went wrong and what the user should check.

## Guidelines

- Do **not** attempt to manually kill processes or start servers yourself — the script handles all of that.
- Do **not** run this command automatically. Only run it when the user explicitly invokes `/restart`.
- If the script is not executable, do not use `chmod` without confirming with the user first — instead, report the permission issue.