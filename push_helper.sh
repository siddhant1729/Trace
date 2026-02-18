#!/bin/bash
echo "Starting git operations..."
cd /home/shaurya/Trace
echo "Current directory: $(pwd)"
git status
echo "Adding README.md..."
git add README.md
echo "Committing..."
git commit -m "Add professional README.md"
echo "Pushing..."
git push
echo "Git operations completed."
