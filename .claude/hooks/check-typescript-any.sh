#!/bin/bash

# Read the hook input
INPUT=$(cat)

# Extract tool name and file path
TOOL_NAME=$(echo "$INPUT" | jq -r '.tool_name // empty')
FILE_PATH=$(echo "$INPUT" | jq -r '.tool_input.file_path // empty')

# Only check TypeScript files after edit operations
if [[ "$TOOL_NAME" =~ ^(Edit|MultiEdit|Write)$ ]] && [[ "$FILE_PATH" =~ \.(ts|tsx)$ ]]; then
    # Check if file exists
    if [[ -f "$FILE_PATH" ]]; then
        # Look for various patterns of 'any' usage and 'as unknown as' double assertions
        if grep -E '(\bas\s+any\b|:\s*any\b|<any>|Promise<any>|Array<any>|\[\s*\]:\s*any|\(\s*\):\s*any|=\s*any\b|\bas\s+unknown\s+as\b)' "$FILE_PATH" > /dev/null; then
            echo "⚠️  TypeScript 'any' or unsafe type assertion detected in $FILE_PATH" >&2
            echo "" >&2
            echo "STRICT POLICY: Using 'any' or 'as unknown as' double assertions is strictly against our TypeScript rules." >&2
            echo "These patterns bypass type safety and should only be used in extreme circumstances." >&2
            echo "" >&2
            echo "Recommended approaches to avoid 'any' and unsafe assertions:" >&2
            echo "" >&2
            echo "AVOID 'as unknown as' double assertions - they're a code smell!" >&2
            echo "Instead of: someValue as unknown as TargetType" >&2
            echo "Use proper type guards, Zod validation, or fix the underlying type issue" >&2
            echo "" >&2
            echo "1. Check for existing types" >&2
            echo "" >&2
            echo "2. Use Zod schemas for runtime validation" >&2
            echo "" >&2
            echo "3. Use type guards for runtime type checking" >&2
            echo "   Example: function isImage(obj: unknown): obj is Image { ... }" >&2
            echo "" >&2
            echo "4. Use 'unknown' and narrow the type with validation" >&2
            echo "   Example: const data: unknown = await response.json();" >&2
            echo "           const validated = Schema.parse(data);" >&2
            echo "" >&2
            echo "5. Define specific interfaces or use existing utility types" >&2
            echo "   Example: Record<string, unknown>, Partial<T>, Pick<T, K>" >&2
            echo "" >&2
            echo "6. Use generics for flexible but type-safe code" >&2
            echo "   Example: function process<T extends BaseType>(item: T): T { ... }" >&2
            echo "" >&2
            echo "If this is truly unavoidable (which is extremely rare), add a comment:" >&2
            echo "// eslint-disable-next-line @typescript-eslint/no-explicit-any" >&2
            echo "// TODO: Remove any - [explain why it's currently needed]" >&2

            # Exit with code 2 to block and show feedback to Claude
            exit 2
        fi
    fi
fi

# All good - no 'any' found or not a TypeScript file
exit 0
