#!/bin/bash

# NFG App Deployment Script
# This script prepares and deploys your app to GitHub and Vercel

echo "🚀 NFG App Deployment Helper"
echo "=============================="
echo ""

# Check if git is installed
if ! command -v git &> /dev/null; then
    echo "❌ Git is not installed. Please install Git first:"
    echo "   Visit: https://git-scm.com/downloads"
    exit 1
fi

# Create .gitignore if it doesn't exist
if [ ! -f .gitignore ]; then
    echo "📝 Creating .gitignore..."
    cat > .gitignore << 'EOF'
# Node modules
node_modules/

# Environment variables
.env
.env.local
.env.production

# OS files
.DS_Store
Thumbs.db

# Editor files
.vscode/
.idea/

# Logs
*.log
npm-debug.log*

# Build output
dist/
build/

# Supabase local
.supabase/
EOF
    echo "✅ .gitignore created"
else
    echo "✅ .gitignore already exists"
fi

# Create vercel.json if it doesn't exist
if [ ! -f vercel.json ]; then
    echo "📝 Creating vercel.json..."
    cat > vercel.json << 'EOF'
{
  "buildCommand": "echo 'No build needed - static site'",
  "outputDirectory": ".",
  "installCommand": "echo 'No install needed'",
  "framework": null
}
EOF
    echo "✅ vercel.json created"
else
    echo "✅ vercel.json already exists"
fi

# Check if git repo exists
if [ ! -d .git ]; then
    echo ""
    echo "📦 Initializing Git repository..."
    git init
    echo "✅ Git initialized"
else
    echo "✅ Git already initialized"
fi

# Add files to git
echo ""
echo "📦 Adding files to Git..."
git add .

# Commit
echo ""
read -p "Enter commit message (or press Enter for default): " commit_msg
if [ -z "$commit_msg" ]; then
    commit_msg="Deploy NFG Facilities App"
fi

git commit -m "$commit_msg"
echo "✅ Changes committed"

# Check if remote exists
if ! git remote | grep -q origin; then
    echo ""
    echo "📍 Setting up GitHub remote..."
    echo ""
    read -p "Enter your GitHub username: " github_user
    read -p "Enter repository name (default: nfg-facilities-app): " repo_name
    
    if [ -z "$repo_name" ]; then
        repo_name="nfg-facilities-app"
    fi
    
    git remote add origin "https://github.com/$github_user/$repo_name.git"
    echo "✅ Remote added: https://github.com/$github_user/$repo_name"
    echo ""
    echo "⚠️  IMPORTANT: Create this repository on GitHub first!"
    echo "   1. Go to: https://github.com/new"
    echo "   2. Repository name: $repo_name"
    echo "   3. Make it PRIVATE (recommended)"
    echo "   4. DON'T initialize with README"
    echo "   5. Click 'Create repository'"
    echo ""
    read -p "Press Enter when repository is created..."
fi

# Push to GitHub
echo ""
echo "📤 Pushing to GitHub..."
git branch -M main
git push -u origin main

if [ $? -eq 0 ]; then
    echo ""
    echo "🎉 SUCCESS! Your code is on GitHub!"
    echo ""
    echo "🌐 Next Steps:"
    echo "=============================="
    echo ""
    echo "1. Deploy to Vercel:"
    echo "   • Visit: https://vercel.com"
    echo "   • Sign up/login with GitHub"
    echo "   • Click 'Add New Project'"
    echo "   • Import your repository"
    echo "   • Click 'Deploy'"
    echo ""
    echo "2. Update Supabase (IMPORTANT!):"
    echo "   • Go to: https://supabase.com/dashboard"
    echo "   • Authentication → URL Configuration"
    echo "   • Add your Vercel URL to Site URL and Redirect URLs"
    echo ""
    echo "3. Test your live app!"
    echo "   • Your Vercel URL will be: https://YOUR-APP.vercel.app"
    echo "   • Send test invitation (no more localhost errors!)"
    echo ""
    echo "📖 See DEPLOY_TO_VERCEL.md for detailed instructions"
else
    echo ""
    echo "❌ Failed to push to GitHub"
    echo ""
    echo "Common issues:"
    echo "• Repository doesn't exist on GitHub yet"
    echo "• Authentication failed (need to login: gh auth login)"
    echo "• Wrong repository URL"
    echo ""
    echo "Run 'git remote -v' to check your remote URL"
fi

