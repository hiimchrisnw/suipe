#!/bin/bash

# Read the hook input
INPUT=$(cat)

# Extract tool name and file path
TOOL_NAME=$(echo "$INPUT" | jq -r '.tool_name // empty')
FILE_PATH=$(echo "$INPUT" | jq -r '.tool_input.file_path // empty')

# Only check React component files after edit operations
if [[ "$TOOL_NAME" =~ ^(Edit|MultiEdit|Write)$ ]] && [[ "$FILE_PATH" =~ \.(tsx|jsx)$ ]]; then
    # Check if file exists
    if [[ -f "$FILE_PATH" ]]; then
        # Look for useEffect usage that isn't suppressed
        if grep -E '\buseEffect\s*\(' "$FILE_PATH" > /dev/null; then
            # Check if there's a suppression comment nearby (within 2 lines before)
            if ! grep -B2 'useEffect\s*(' "$FILE_PATH" | grep -q 'eslint-disable.*react-hooks/rules-of-hooks\|legitimate-useeffect'; then
                echo "⚠️  useEffect detected in $FILE_PATH" >&2
                echo "" >&2
                echo "PREFERENCE: We prefer action-based patterns over effect-based ones." >&2
                echo "" >&2
                echo "WHY WE AVOID useEffect:" >&2
                echo "" >&2
                echo "  1. INDIRECTION - Effects separate cause from consequence. When debugging," >&2
                echo "     you see state change but must hunt for which effect responds to it." >&2
                echo "     Action-based code keeps cause and effect together." >&2
                echo "" >&2
                echo "  2. TIMING UNCERTAINTY - Effects run after render, creating subtle bugs" >&2
                echo "     around 'when does this actually happen?' Action-based code runs" >&2
                echo "     exactly when you call it." >&2
                echo "" >&2
                echo "  3. STALE CLOSURES - Effects capture values from render scope, leading" >&2
                echo "     to bugs where effects see old values. Actions use current values." >&2
                echo "" >&2
                echo "  4. IMPLICIT DEPENDENCIES - The dependency array is error-prone and" >&2
                echo "     creates cognitive load. Actions have explicit, obvious data flow." >&2
                echo "" >&2
                echo "ASK YOURSELF: Can this be triggered directly from an action instead?" >&2
                echo "" >&2
                echo "LEGITIMATE useEffect uses:" >&2
                echo "  ✓ Subscribing to WebSockets or external event sources" >&2
                echo "  ✓ Setting up intervals/timers that need cleanup" >&2
                echo "  ✓ Third-party library initialization (charts, maps, etc.)" >&2
                echo "  ✓ Document/window event listeners with cleanup" >&2
                echo "" >&2
                echo "AVOID useEffect for:" >&2
                echo "  ✗ 'When X changes, do Y' - put Y in the action that changes X" >&2
                echo "  ✗ Derived state - use useMemo or compute inline" >&2
                echo "  ✗ API calls on state change - trigger from the action" >&2
                echo "  ✗ Syncing state between components - lift state up or use context" >&2
                echo "" >&2
                echo "REFACTOR PATTERN:" >&2
                echo "  Instead of: useEffect(() => { doThing() }, [someState])" >&2
                echo "  Do: In the handler that sets someState, also call doThing()" >&2
                echo "" >&2
                echo "If this is a legitimate use case, add a comment above:" >&2
                echo "// legitimate-useeffect: subscribing to [describe what]" >&2
                echo "" >&2

                # Exit with code 2 to block and show feedback to Claude
                exit 2
            fi
        fi
    fi
fi

# All good - no problematic useEffect found
exit 0
