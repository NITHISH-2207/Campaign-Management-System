const SurveyResponse = require('../models/SurveyResponse');

class ImpactCalculator {
    async calculateImpact(campaignId) {
        try {
            // Get all survey responses for the campaign
            const beforeResponses = await SurveyResponse.find({
                campaign: campaignId,
                surveyType: 'before'
            }).populate('survey');
            
            const afterResponses = await SurveyResponse.find({
                campaign: campaignId,
                surveyType: 'after'
            }).populate('survey');

            if (!beforeResponses.length || !afterResponses.length) {
                return {
                    overallChange: 0,
                    categoryChanges: {},
                    participationRate: {
                        before: beforeResponses.length,
                        after: afterResponses.length,
                        retention: 0
                    },
                    insights: ['Insufficient data for impact analysis']
                };
            }

            // Calculate impact by category
            const categories = ['awareness', 'behavior', 'attitude', 'knowledge'];
            const categoryChanges = {};
            
            for (const category of categories) {
                const beforeScores = this.calculateCategoryScores(beforeResponses, category);
                const afterScores = this.calculateCategoryScores(afterResponses, category);
                
                const percentageChange = beforeScores.average > 0 
                    ? ((afterScores.average - beforeScores.average) / beforeScores.average) * 100
                    : 0;
                
                categoryChanges[category] = {
                    preAverage: beforeScores.average,
                    postAverage: afterScores.average,
                    percentageChange: percentageChange,
                    improvement: percentageChange > 0
                };
            }

            const overallChange = Object.values(categoryChanges)
                .reduce((sum, cat) => sum + cat.percentageChange, 0) / categories.length;

            return {
                categoryChanges,
                overallChange,
                participationRate: {
                    before: beforeResponses.length,
                    after: afterResponses.length,
                    retention: (afterResponses.length / beforeResponses.length) * 100
                },
                insights: this.generateInsights(categoryChanges)
            };
        } catch (error) {
            console.error('Error calculating impact:', error);
            throw error;
        }
    }

    calculateCategoryScores(responses, category) {
        let totalScore = 0;
        let count = 0;
        
        responses.forEach(response => {
            response.responses.forEach(answer => {
                if (answer.category === category && typeof answer.answer === 'number') {
                    totalScore += answer.answer;
                    count++;
                }
            });
        });
        
        return {
            total: totalScore,
            average: count > 0 ? totalScore / count : 0,
            count
        };
    }

    generateInsights(categoryChanges) {
        const insights = [];
        
        Object.entries(categoryChanges).forEach(([category, data]) => {
            if (data.percentageChange > 20) {
                insights.push(`Significant improvement in ${category} (+${data.percentageChange.toFixed(1)}%)`);
            } else if (data.percentageChange < -10) {
                insights.push(`${category} needs attention (${data.percentageChange.toFixed(1)}%)`);
            }
        });

        if (insights.length === 0) {
            insights.push('Campaign maintained consistent awareness levels');
        }

        return insights;
    }
}

module.exports = new ImpactCalculator();
