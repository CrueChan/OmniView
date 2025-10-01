#!/bin/bash
# apply-doc-updates.sh
# Script to apply all documentation updates to OmniView project

set -e

echo "🎬 OmniView Documentation Update Script"
echo "========================================"
echo ""

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Check if we're in the right directory
if [ ! -f "package.json" ]; then
    echo -e "${RED}❌ Error: package.json not found.${NC}"
    echo "Please run this script from the OmniView project root directory."
    exit 1
fi

# Verify it's an OmniView project
if ! grep -q "omniview" package.json; then
    echo -e "${YELLOW}⚠️  Warning: This doesn't appear to be an OmniView project.${NC}"
    read -p "Continue anyway? (y/N) " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        exit 1
    fi
fi

echo -e "${BLUE}📋 Starting documentation update process...${NC}"
echo ""

# Step 1: Create backup
echo -e "${YELLOW}📦 Step 1: Creating backups...${NC}"
BACKUP_DIR="docs-backup-$(date +%Y%m%d-%H%M%S)"
mkdir -p "$BACKUP_DIR"

# Backup existing files
for file in README.md CONTRIBUTING.md Dockerfile docker-compose.yml .dockerignore .env.example; do
    if [ -f "$file" ]; then
        cp "$file" "$BACKUP_DIR/"
        echo "  ✓ Backed up $file"
    fi
done

echo -e "${GREEN}✅ Backups created in $BACKUP_DIR${NC}"
echo ""

# Step 2: Git branch
echo -e "${YELLOW}🌿 Step 2: Creating git branch...${NC}"
read -p "Create a new branch for updates? (Y/n) " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Nn]$ ]]; then
    BRANCH_NAME="docs-update-$(date +%Y%m%d)"
    git checkout -b "$BRANCH_NAME" 2>/dev/null || git checkout "$BRANCH_NAME"
    echo -e "${GREEN}✅ Branch '$BRANCH_NAME' created/checked out${NC}"
else
    echo -e "${YELLOW}⚠️  Skipping branch creation${NC}"
fi
echo ""

# Step 3: Check which files need updates
echo -e "${YELLOW}📝 Step 3: Checking files to update...${NC}"
echo ""
echo "The following files will be updated/created:"
echo "  1. README.md - Enhanced with Docker deployment"
echo "  2. CONTRIBUTING.md - Added Docker development option"
echo "  3. GITHUB_ACTIONS.md - NEW: Workflow documentation"
echo "  4. Dockerfile - Optimizations (if needed)"
echo "  5. docker-compose.yml - Enhanced configuration"
echo "  6. .dockerignore - Build optimization"
echo ""

read -p "Proceed with updates? (Y/n) " -n 1 -r
echo
if [[ $REPLY =~ ^[Nn]$ ]]; then
    echo -e "${RED}❌ Update cancelled${NC}"
    exit 1
fi

# Step 4: Apply updates
echo ""
echo -e "${YELLOW}🔄 Step 4: Preparing to apply updates...${NC}"
echo ""
echo -e "${BLUE}ℹ️  Manual Steps Required:${NC}"
echo ""
echo "1. Update README.md:"
echo "   - Copy the updated content from the artifact"
echo "   - Replace your current README.md"
echo ""
echo "2. Update CONTRIBUTING.md:"
echo "   - Copy the updated content from the artifact"
echo "   - Replace your current CONTRIBUTING.md"
echo ""
echo "3. Create GITHUB_ACTIONS.md:"
echo "   - Copy the content from the artifact"
echo "   - Create new file: GITHUB_ACTIONS.md"
echo ""
echo "4. Update docker-compose.yml:"
echo "   - Copy the enhanced configuration from the artifact"
echo "   - Merge with your existing configuration"
echo ""
echo "5. Update .dockerignore:"
echo "   - Copy the optimized content from the artifact"
echo "   - Replace your current .dockerignore"
echo ""

read -p "Have you completed the manual updates? (y/N) " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo -e "${YELLOW}⚠️  Please complete the updates manually and run this script again${NC}"
    exit 1
fi

# Step 5: Verify updates
echo ""
echo -e "${YELLOW}🔍 Step 5: Verifying updates...${NC}"
echo ""

ERRORS=0

# Check if files exist and have content
check_file() {
    local file=$1
    local min_size=$2
    
    if [ ! -f "$file" ]; then
        echo -e "  ${RED}❌ $file not found${NC}"
        ERRORS=$((ERRORS + 1))
        return 1
    fi
    
    local size=$(wc -c < "$file")
    if [ "$size" -lt "$min_size" ]; then
        echo -e "  ${YELLOW}⚠️  $file seems too small (${size} bytes)${NC}"
        ERRORS=$((ERRORS + 1))
        return 1
    fi
    
    echo -e "  ${GREEN}✓ $file (${size} bytes)${NC}"
    return 0
}

check_file "README.md" 10000
check_file "CONTRIBUTING.md" 8000
check_file "GITHUB_ACTIONS.md" 5000
check_file "Dockerfile" 500
check_file "docker-compose.yml" 1000
check_file ".dockerignore" 500
check_file ".env.example" 500

echo ""

if [ $ERRORS -gt 0 ]; then
    echo -e "${YELLOW}⚠️  Found $ERRORS potential issues. Please review the files.${NC}"
    read -p "Continue anyway? (y/N) " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        exit 1
    fi
fi

# Step 6: Test Docker build
echo ""
echo -e "${YELLOW}🐳 Step 6: Testing Docker build...${NC}"
read -p "Test Docker build locally? (Y/n) " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Nn]$ ]]; then
    echo "Building Docker image..."
    if docker build -t omniview-test . > /dev/null 2>&1; then
        echo -e "${GREEN}✅ Docker build successful${NC}"
        
        # Get image size
        IMAGE_SIZE=$(docker images omniview-test --format "{{.Size}}")
        echo "  Image size: $IMAGE_SIZE"
        
        # Cleanup
        docker rmi omniview-test > /dev/null 2>&1
    else
        echo -e "${RED}❌ Docker build failed${NC}"
        echo "Please check Dockerfile for errors"
        ERRORS=$((ERRORS + 1))
    fi
else
    echo -e "${YELLOW}⚠️  Skipping Docker build test${NC}"
fi

# Step 7: Test Docker Compose
echo ""
echo -e "${YELLOW}🚀 Step 7: Testing Docker Compose...${NC}"
read -p "Test Docker Compose configuration? (y/N) " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    echo "Validating docker-compose.yml..."
    if docker-compose config > /dev/null 2>&1; then
        echo -e "${GREEN}✅ docker-compose.yml is valid${NC}"
    else
        echo -e "${RED}❌ docker-compose.yml has errors${NC}"
        ERRORS=$((ERRORS + 1))
    fi
else
    echo -e "${YELLOW}⚠️  Skipping Docker Compose test${NC}"
fi

# Step 8: Git status
echo ""
echo -e "${YELLOW}📊 Step 8: Reviewing changes...${NC}"
echo ""
echo "Changed files:"
git status --short

echo ""
echo "File statistics:"
for file in README.md CONTRIBUTING.md GITHUB_ACTIONS.md; do
    if [ -f "$file" ]; then
        lines=$(wc -l < "$file")
        echo "  $file: $lines lines"
    fi
done

# Step 9: Commit changes
echo ""
echo -e "${YELLOW}💾 Step 9: Committing changes...${NC}"
read -p "Commit all changes? (Y/n) " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Nn]$ ]]; then
    git add README.md CONTRIBUTING.md GITHUB_ACTIONS.md
    git add Dockerfile docker-compose.yml .dockerignore .env.example 2>/dev/null || true
    
    echo ""
    echo "Suggested commit message:"
    echo "---------------------------------------"
    echo "docs: comprehensive documentation update with Docker and CI/CD guides"
    echo ""
    echo "- Enhanced README.md with complete Docker deployment guide"
    echo "- Updated CONTRIBUTING.md with Docker development option"
    echo "- Created GITHUB_ACTIONS.md for workflow documentation"
    echo "- Optimized Dockerfile and docker-compose.yml"
    echo "- Updated .dockerignore for better build efficiency"
    echo "---------------------------------------"
    echo ""
    
    read -p "Use this commit message? (Y/n) " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Nn]$ ]]; then
        git commit -m "docs: comprehensive documentation update with Docker and CI/CD guides

- Enhanced README.md with complete Docker deployment guide
- Updated CONTRIBUTING.md with Docker development option
- Created GITHUB_ACTIONS.md for workflow documentation
- Optimized Dockerfile and docker-compose.yml
- Updated .dockerignore for better build efficiency"
        echo -e "${GREEN}✅ Changes committed${NC}"
    else
        echo "Please commit manually with your preferred message"
        git status
    fi
else
    echo -e "${YELLOW}⚠️  Skipping commit${NC}"
fi

# Step 10: Final summary
echo ""
echo "========================================"
echo -e "${GREEN}🎉 Documentation Update Complete!${NC}"
echo "========================================"
echo ""
echo "📋 Summary:"
echo "  ✓ Backups created in: $BACKUP_DIR"
echo "  ✓ README.md updated"
echo "  ✓ CONTRIBUTING.md updated"
echo "  ✓ GITHUB_ACTIONS.md created"
echo "  ✓ Docker files optimized"
echo ""

if [ $ERRORS -gt 0 ]; then
    echo -e "${YELLOW}⚠️  Warning: Found $ERRORS issues during verification${NC}"
    echo "Please review the files before pushing"
    echo ""
fi

echo "📌 Next Steps:"
echo ""
echo "1. Review all changes:"
echo "   git diff HEAD~1"
echo ""
echo "2. Test locally:"
echo "   docker-compose up -d --build"
echo "   curl http://localhost:8899"
echo ""
echo "3. Push to GitHub:"
if git rev-parse --abbrev-ref HEAD > /dev/null 2>&1; then
    CURRENT_BRANCH=$(git rev-parse --abbrev-ref HEAD)
    echo "   git push origin $CURRENT_BRANCH"
else
    echo "   git push origin main"
fi
echo ""
echo "4. Create Pull Request (if using a branch)"
echo ""
echo "5. Verify on GitHub that formatting is correct"
echo ""

echo "📚 Documentation Files:"
echo "  • README.md - Main documentation"
echo "  • CONTRIBUTING.md - Contribution guide"
echo "  • GITHUB_ACTIONS.md - CI/CD workflows"
echo ""

echo "🔗 Useful Links:"
echo "  • Docker Hub: https://hub.docker.com"
echo "  • GitHub Actions: https://github.com/features/actions"
echo "  • Project Issues: https://github.com/CrueChan/OmniView/issues"
echo ""

if [ -d "$BACKUP_DIR" ]; then
    echo -e "${BLUE}💡 Tip: Backups are saved in $BACKUP_DIR${NC}"
    echo "   You can restore them if needed"
    echo ""
fi

echo -e "${GREEN}✨ All done! Happy coding! ✨${NC}"