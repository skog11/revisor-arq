#!/bin/bash

# Stop hook to remind about commits after 5+ modified files
count=$(git status --porcelain 2>/dev/null | wc -l)
if [ "$count" -ge 5 ]; then
    echo "Reminder: You have $count files modified without committing."
    echo "Consider making a commit with: git add . && git commit -m 'descriptive message'"
fi

exit 0