#!/bin/bash

# PreToolUse hook to block rm -rf on protected directories
if [[ "$1" == "rm" && "$2" == "-rf" ]]; then
    shift 2
    for arg in "$@"; do
        if [[ "$arg" == /* ]]; then
            if [[ "$arg" == *"/corpus"* ]] || [[ "$arg" == *".env.local"* ]]; then
                echo "Error: rm -rf blocked on protected path: $arg"
                exit 1
            fi
        else
            # Relative paths - check if they contain protected directories
            if [[ "$arg" == *"corpus"* ]] || [[ "$arg" == *".env.local"* ]]; then
                echo "Error: rm -rf blocked on protected path: $arg"
                exit 1
            fi
        fi
    done
fi

exit 0