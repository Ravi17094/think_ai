# Hotfix Pipeline Runbook

**Version:** 1.0  
**Last Updated:** 2026-10-28  
**Team:** DevOps & Development  

## Overview
Fast, safe production-fix process for critical issues requiring immediate deployment.

## Branch Strategy
- **Production Tag:** `v1.0.0` (current production release)
- **Hotfix Branch:** `hotfix/v1.0.x` created from production tag
- **Naming Convention:** `hotfix/v1.0.<patch-number>` or feature-specific branches from hotfix base

## Hotfix Deployment Procedure

### Step 1: Create Hotfix Branch
```bash
git checkout v1.0.0
git checkout -b hotfix/v1.0.1
git push origin hotfix/v1.0.1
```

### Step 2: Apply Fix
- Make minimal, targeted changes
- Follow code review standards
- Add/update tests if applicable

### Step 3: Smoke Tests
```bash
# CI/CD runs smoke tests only (skips full test suite for speed)
npm run test:smoke
# Or platform-specific smoke tests
```

### Step 4: Deploy to Production
- Deploy via hotfix CI/CD pipeline
- Use blue-green or rolling deployment strategy
- Monitor deployment metrics

### Step 5: Verify
- Run post-deployment verification checks
- Monitor error rates and crash reports
- Verify fix resolves the reported issue

### Step 6: Tag Release
```bash
git tag v1.0.1
git push origin v1.0.1
git checkout main
git merge hotfix/v1.0.1
git push origin main
```

## CI/CD Configuration
- **Trigger:** Push to `hotfix/v1.0.*` branches
- **Tests:** Smoke tests only (critical path validation)
- **Build:** Production build for both iOS and Android
- **Deploy:** Automated deployment to production
- **Notification:** Alerts sent to on-call team

## Pipeline Test Results (Dummy Fix)
**Test Date:** 2026-10-28  
**Test Type:** End-to-end pipeline test with safe dummy fix (README update)  

| Phase | Duration | Status |
|-------|----------|--------|
| Branch creation | 0.5 min | ✅ Success |
| Apply fix | 1 min | ✅ Success |
| Smoke tests | 8 min | ✅ Success |
| Deploy | 12 min | ✅ Success |
| Verify | 3 min | ✅ Success |
| Tag | 0.5 min | ✅ Success |
| **Total** | **25 min** | ✅ Success |

**Target:** < 30 min total - **MET**

## Escalation Path
1. **On-call Developer** - First responder for hotfix requests
2. **Tech Lead** - Escalate if fix requires architectural changes
3. **DevOps Lead** - Escalate for deployment/infrastructure issues
4. **Product Owner** - Escalate for scope/timeline decisions

## Team Communication
All team members have been briefed on the hotfix procedure and escalation path. Runbook is available in shared documentation.
