#!/usr/bin/env node

/**
 * Code Review Agents Demo
 * Demonstrates how to use the specialized code review agents
 */

const { CodeReviewOrchestrator } = require('./agents/code-review-orchestrator');

async function runCodeReview() {
    console.log('🚀 Starting Code Review Demo...\n');

    try {
        // Create the orchestrator
        const orchestrator = new CodeReviewOrchestrator();

        // Initialize all agents
        console.log('📋 Initializing Code Review Agents...');
        await orchestrator.initialize();

        // Create a mock task
        const task = {
            id: 'demo-review-1',
            type: 'analysis',
            agentId: orchestrator.id,
            requirements: {
                id: 'demo-requirements',
                description: 'Demo code review for auto-code project',
                appType: 'fullstack',
                features: ['code-generation', 'agent-system', 'automation'],
                techStack: {
                    frontend: 'react',
                    backend: 'nodejs',
                    database: 'postgresql',
                    deployment: 'docker'
                },
                timeline: 30,
                priority: 'high'
            },
            dependencies: [],
            status: 'pending',
            output: {
                codebasePath: '.'
            }
        };

        // Execute the comprehensive review
        console.log('🔍 Executing Comprehensive Code Review...');
        const result = await orchestrator.execute(task);

        if (result.success) {
            console.log('\n✅ Code Review Completed Successfully!');
            console.log('='.repeat(80));

            const report = result.data;

            // Display summary
            console.log(`📊 OVERALL SCORE: ${report.overallScore}/100`);
            console.log(`📅 TIMESTAMP: ${report.timestamp}`);
            console.log(`🚨 CRITICAL ISSUES: ${report.criticalIssues}`);
            console.log(`⚠️  HIGH PRIORITY ISSUES: ${report.highPriorityIssues}`);

            console.log('\n📝 SUMMARY:');
            console.log(report.summary);

            // Display individual review scores
            console.log('\n🔍 INDIVIDUAL REVIEW SCORES:');
            if (report.reviews.quality) {
                console.log(`  Code Quality: ${report.reviews.quality.overallScore}/100`);
            }
            if (report.reviews.security) {
                console.log(`  Security: ${report.reviews.security.overallScore}/100 (Risk: ${report.reviews.security.riskLevel})`);
            }
            if (report.reviews.performance) {
                console.log(`  Performance: ${report.reviews.performance.overallScore}/100`);
            }
            if (report.reviews.architecture) {
                console.log(`  Architecture: ${report.reviews.architecture.overallScore}/100`);
            }
            if (report.reviews.documentation) {
                console.log(`  Documentation: ${report.reviews.documentation.overallScore}/100`);
            }

            // Display top recommendations
            console.log('\n💡 TOP RECOMMENDATIONS:');
            const topRecommendations = report.recommendations.slice(0, 5);
            topRecommendations.forEach((rec, index) => {
                console.log(`  ${index + 1}. ${rec}`);
            });

            // Display next steps
            console.log('\n🎯 NEXT STEPS:');
            report.nextSteps.forEach((step, index) => {
                console.log(`  ${index + 1}. ${step}`);
            });

            // Display detailed issues if any
            if (report.criticalIssues > 0 || report.highPriorityIssues > 0) {
                console.log('\n🚨 DETAILED ISSUES:');

                Object.entries(report.reviews).forEach(([type, review]) => {
                    if (review && review.issues && review.issues.length > 0) {
                        const criticalIssues = review.issues.filter(i => i.severity === 'critical');
                        const highIssues = review.issues.filter(i => i.severity === 'high');

                        if (criticalIssues.length > 0 || highIssues.length > 0) {
                            console.log(`\n  ${type.toUpperCase()} REVIEW:`);

                            if (criticalIssues.length > 0) {
                                console.log(`    Critical Issues:`);
                                criticalIssues.slice(0, 3).forEach(issue => {
                                    console.log(`      - ${issue.title}: ${issue.description}`);
                                });
                            }

                            if (highIssues.length > 0) {
                                console.log(`    High Priority Issues:`);
                                highIssues.slice(0, 3).forEach(issue => {
                                    console.log(`      - ${issue.title}: ${issue.description}`);
                                });
                            }
                        }
                    }
                });
            }

        } else {
            console.error('❌ Code Review Failed:', result.error);
        }

        // Cleanup
        await orchestrator.cleanup();

    } catch (error) {
        console.error('💥 Demo failed:', error);
    }
}

// Run the demo if this file is executed directly
if (require.main === module) {
    runCodeReview().catch(console.error);
}

module.exports = { runCodeReview };