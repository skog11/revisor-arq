#!/bin/bash

# PostToolUse hook to run lint fix on .ts/.tsx files after Edit/Write
if [[ "$1" == "Edit" || "$1" == "Write" ]]; then
    # Check if the file being modified is a TypeScript file
    if [[ "$3" == *.ts ]] || [[ "$3" == *.tsx ]]; then
        echo "Running ESLint with --fix on modified file: $3"
        npx eslint "$3" --fix
    fi
fi

exit 0